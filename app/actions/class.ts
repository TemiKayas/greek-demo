'use server';

import { z } from 'zod';
import { db } from '@/lib/db';
import { auth } from '@/lib/auth';
import { generateUniqueInviteCode } from '@/lib/utils/invite-code';
import { revalidatePath } from 'next/cache';
import type { Prisma } from '@prisma/client';

// Type definitions for complex query returns
type TeacherClassData = Prisma.ClassGetPayload<{
  include: {
    _count: {
      select: {
        memberships: true;
        files: true;
      };
    };
    inviteCodes: true;
  };
}>;

type ClassDetailsData = Prisma.ClassGetPayload<{
  include: {
    teacher: {
      select: {
        id: true;
        name: true;
        email: true;
      };
    };
    memberships: {
      include: {
        user: {
          select: {
            id: true;
            name: true;
            email: true;
            createdAt: true;
          };
        };
      };
    };
    inviteCodes: {
      where: {
        isActive: true;
      };
      orderBy: {
        createdAt: 'desc';
      };
    };
    files: {
      orderBy: {
        createdAt: 'desc';
      };
    };
    _count: {
      select: {
        memberships: true;
        files: true;
        chatConversations: true;
        worksheets: true;
      };
    };
  };
}>;

type StudentClassData = Prisma.ClassGetPayload<{
  include: {
    teacher: {
      select: {
        id: true;
        name: true;
        email: true;
      };
    };
    _count: {
      select: {
        files: true;
        memberships: true;
      };
    };
  };
}> & {
  joinedAt: Date;
};

// Validation schemas
const createClassSchema = z.object({
  name: z.string().min(1, 'Class name is required').max(100, 'Class name is too long'),
  description: z.string().max(500, 'Description is too long').optional(),
});

const updateClassSchema = z.object({
  name: z.string().min(1, 'Class name is required').max(100, 'Class name is too long').optional(),
  description: z.string().max(500, 'Description is too long').optional(),
  isActive: z.boolean().optional(),
});

// Types
type ActionResult<T = void> =
  | { success: true; data: T }
  | { success: false; error: string };

/**
 * Create a new class (teachers only)
 */
export async function createClass(formData: FormData): Promise<ActionResult<{ classId: string; inviteCode: string }>> {
  try {
    const session = await auth();

    if (!session?.user || session.user.role !== 'TEACHER') {
      return { success: false, error: 'Only teachers can create classes' };
    }

    // Validate input
    const rawData = {
      name: formData.get('name'),
      description: formData.get('description') || '',
    };

    const validatedData = createClassSchema.safeParse(rawData);

    if (!validatedData.success) {
      return {
        success: false,
        error: validatedData.error.issues[0]?.message || 'Invalid form data',
      };
    }

    const { name, description } = validatedData.data;

    // Generate unique invite code
    const code = await generateUniqueInviteCode();

    // Create class with initial invite code
    const newClass = await db.class.create({
      data: {
        teacherId: session.user.id,
        name,
        description: description || null,
        inviteCodes: {
          create: {
            code,
            createdBy: session.user.id,
            isActive: true,
          },
        },
      },
      include: {
        inviteCodes: true,
      },
    });

    revalidatePath('/classes');

    return {
      success: true,
      data: {
        classId: newClass.id,
        inviteCode: code,
      },
    };
  } catch (error) {
    console.error('Create class error:', error);
    return {
      success: false,
      error: 'Failed to create class. Please try again.',
    };
  }
}

/**
 * Get all classes for the current teacher
 */
export async function getTeacherClasses(): Promise<ActionResult<TeacherClassData[]>> {
  try {
    const session = await auth();

    if (!session?.user || session.user.role !== 'TEACHER') {
      return { success: false, error: 'Not authorized' };
    }

    const classes = await db.class.findMany({
      where: {
        teacherId: session.user.id,
      },
      include: {
        _count: {
          select: {
            memberships: true,
            files: true,
          },
        },
        inviteCodes: {
          where: { isActive: true },
          take: 1,
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
    });

    return {
      success: true,
      data: classes,
    };
  } catch (error) {
    console.error('Get teacher classes error:', error);
    return {
      success: false,
      error: 'Failed to fetch classes',
    };
  }
}

/**
 * Get class details including students
 */
export async function getClassDetails(classId: string): Promise<ActionResult<ClassDetailsData>> {
  try {
    const session = await auth();

    if (!session?.user) {
      return { success: false, error: 'Not authenticated' };
    }

    const classData = await db.class.findUnique({
      where: { id: classId },
      include: {
        teacher: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
        memberships: {
          include: {
            user: {
              select: {
                id: true,
                name: true,
                email: true,
                createdAt: true,
              },
            },
          },
          orderBy: {
            joinedAt: 'desc',
          },
        },
        inviteCodes: {
          where: { isActive: true },
          orderBy: {
            createdAt: 'desc',
          },
        },
        files: {
          orderBy: {
            createdAt: 'desc',
          },
        },
        _count: {
          select: {
            memberships: true,
            files: true,
            chatConversations: true,
            worksheets: true,
          },
        },
      },
    });

    if (!classData) {
      return { success: false, error: 'Class not found' };
    }

    // Check authorization
    const isTeacher = session.user.role === 'TEACHER' && classData.teacherId === session.user.id;
    const isStudent = session.user.role === 'STUDENT' && classData.memberships.some(m => m.userId === session.user.id);

    if (!isTeacher && !isStudent) {
      return { success: false, error: 'Not authorized to view this class' };
    }

    return {
      success: true,
      data: classData,
    };
  } catch (error) {
    console.error('Get class details error:', error);
    return {
      success: false,
      error: 'Failed to fetch class details',
    };
  }
}

/**
 * Update class information (teachers only)
 */
export async function updateClass(
  classId: string,
  formData: FormData
): Promise<ActionResult> {
  try {
    const session = await auth();

    if (!session?.user || session.user.role !== 'TEACHER') {
      return { success: false, error: 'Not authorized' };
    }

    // Verify ownership
    const classData = await db.class.findUnique({
      where: { id: classId },
    });

    if (!classData || classData.teacherId !== session.user.id) {
      return { success: false, error: 'Not authorized' };
    }

    // Validate input
    const rawData = {
      name: formData.get('name') || undefined,
      description: formData.get('description') || undefined,
      isActive: formData.get('isActive') === 'true' ? true : undefined,
    };

    const validatedData = updateClassSchema.safeParse(rawData);

    if (!validatedData.success) {
      return {
        success: false,
        error: validatedData.error.issues[0]?.message || 'Invalid form data',
      };
    }

    // Update class
    await db.class.update({
      where: { id: classId },
      data: {
        ...validatedData.data,
        description: validatedData.data.description || null,
      },
    });

    revalidatePath('/classes');
    revalidatePath(`/classes/${classId}`);

    return { success: true, data: undefined };
  } catch (error) {
    console.error('Update class error:', error);
    return {
      success: false,
      error: 'Failed to update class',
    };
  }
}

/**
 * Delete a class (teachers only)
 */
export async function deleteClass(classId: string): Promise<ActionResult> {
  try {
    const session = await auth();

    if (!session?.user || session.user.role !== 'TEACHER') {
      return { success: false, error: 'Not authorized' };
    }

    // Verify ownership
    const classData = await db.class.findUnique({
      where: { id: classId },
    });

    if (!classData || classData.teacherId !== session.user.id) {
      return { success: false, error: 'Not authorized' };
    }

    // Delete class (cascade will handle related records)
    await db.class.delete({
      where: { id: classId },
    });

    revalidatePath('/classes');

    return { success: true, data: undefined };
  } catch (error) {
    console.error('Delete class error:', error);
    return {
      success: false,
      error: 'Failed to delete class',
    };
  }
}

/**
 * Generate a new invite code for a class
 */
export async function generateNewInviteCode(
  classId: string,
  expiresInDays?: number
): Promise<ActionResult<{ code: string }>> {
  try {
    const session = await auth();

    if (!session?.user || session.user.role !== 'TEACHER') {
      return { success: false, error: 'Not authorized' };
    }

    // Verify ownership
    const classData = await db.class.findUnique({
      where: { id: classId },
    });

    if (!classData || classData.teacherId !== session.user.id) {
      return { success: false, error: 'Not authorized' };
    }

    // Generate unique code
    const code = await generateUniqueInviteCode();

    // Calculate expiration date if provided
    const expiresAt = expiresInDays
      ? new Date(Date.now() + expiresInDays * 24 * 60 * 60 * 1000)
      : null;

    // Create invite code
    await db.inviteCode.create({
      data: {
        classId,
        code,
        createdBy: session.user.id,
        isActive: true,
        expiresAt,
      },
    });

    revalidatePath(`/classes/${classId}`);

    return {
      success: true,
      data: { code },
    };
  } catch (error) {
    console.error('Generate invite code error:', error);
    return {
      success: false,
      error: 'Failed to generate invite code',
    };
  }
}

/**
 * Deactivate an invite code
 */
export async function revokeInviteCode(codeId: string): Promise<ActionResult> {
  try {
    const session = await auth();

    if (!session?.user || session.user.role !== 'TEACHER') {
      return { success: false, error: 'Not authorized' };
    }

    // Get invite code with class info
    const inviteCode = await db.inviteCode.findUnique({
      where: { id: codeId },
      include: { class: true },
    });

    if (!inviteCode) {
      return { success: false, error: 'Invite code not found' };
    }

    // Verify ownership
    if (inviteCode.class.teacherId !== session.user.id) {
      return { success: false, error: 'Not authorized' };
    }

    // Deactivate code
    await db.inviteCode.update({
      where: { id: codeId },
      data: { isActive: false },
    });

    revalidatePath(`/classes/${inviteCode.classId}`);

    return { success: true, data: undefined };
  } catch (error) {
    console.error('Revoke invite code error:', error);
    return {
      success: false,
      error: 'Failed to revoke invite code',
    };
  }
}

/**
 * Validate an invite code (public - can be called before authentication)
 */
export async function validateInviteCodeAction(code: string): Promise<ActionResult<{
  code: string;
  classId: string;
  class: {
    id: string;
    name: string;
    description: string | null;
    teacherId: string;
    teacher?: {
      name: string;
    };
  };
}>> {
  try {
    const inviteCode = await db.inviteCode.findUnique({
      where: { code: code.toUpperCase() },
      include: {
        class: {
          include: {
            teacher: {
              select: {
                name: true,
              },
            },
          },
        },
      },
    });

    if (!inviteCode) {
      return {
        success: false,
        error: 'Invalid invite code',
      };
    }

    if (!inviteCode.isActive) {
      return {
        success: false,
        error: 'This invite code has been deactivated',
      };
    }

    if (inviteCode.expiresAt && inviteCode.expiresAt < new Date()) {
      return {
        success: false,
        error: 'This invite code has expired',
      };
    }

    return {
      success: true,
      data: {
        code: inviteCode.code,
        classId: inviteCode.classId,
        class: {
          id: inviteCode.class.id,
          name: inviteCode.class.name,
          description: inviteCode.class.description,
          teacherId: inviteCode.class.teacherId,
          teacher: inviteCode.class.teacher,
        },
      },
    };
  } catch (error) {
    console.error('Validate invite code error:', error);
    return {
      success: false,
      error: 'Failed to validate invite code',
    };
  }
}

/**
 * Join a class using an invite code (students only)
 */
export async function joinClassWithCode(code: string): Promise<ActionResult<{ classId: string }>> {
  try {
    const session = await auth();

    if (!session?.user) {
      return { success: false, error: 'Not authenticated' };
    }

    if (session.user.role !== 'STUDENT') {
      return { success: false, error: 'Only students can join classes' };
    }

    // Validate invite code
    const { validateInviteCode } = await import('@/lib/utils/invite-code');
    const validation = await validateInviteCode(code);

    if (!validation.valid) {
      return { success: false, error: validation.error! };
    }

    const inviteCode = validation.inviteCode!;

    // Check if already a member
    const existing = await db.classMembership.findUnique({
      where: {
        classId_userId: {
          classId: inviteCode.classId,
          userId: session.user.id,
        },
      },
    });

    if (existing) {
      return { success: false, error: 'You are already a member of this class' };
    }

    // Create membership
    await db.classMembership.create({
      data: {
        classId: inviteCode.classId,
        userId: session.user.id,
      },
    });

    // Increment used count
    await db.inviteCode.update({
      where: { id: inviteCode.id },
      data: {
        usedCount: {
          increment: 1,
        },
      },
    });

    revalidatePath('/dashboard');

    return {
      success: true,
      data: { classId: inviteCode.classId },
    };
  } catch (error) {
    console.error('Join class error:', error);
    return {
      success: false,
      error: 'Failed to join class',
    };
  }
}

/**
 * Get all classes the current student is enrolled in
 */
export async function getStudentClasses(): Promise<ActionResult<StudentClassData[]>> {
  try {
    const session = await auth();

    if (!session?.user || session.user.role !== 'STUDENT') {
      return { success: false, error: 'Not authorized' };
    }

    const memberships = await db.classMembership.findMany({
      where: {
        userId: session.user.id,
      },
      include: {
        class: {
          include: {
            teacher: {
              select: {
                id: true,
                name: true,
                email: true,
              },
            },
            _count: {
              select: {
                files: true,
                memberships: true,
              },
            },
          },
        },
      },
      orderBy: {
        joinedAt: 'desc',
      },
    });

    const classes = memberships.map((m) => ({
      ...m.class,
      joinedAt: m.joinedAt,
    }));

    return {
      success: true,
      data: classes,
    };
  } catch (error) {
    console.error('Get student classes error:', error);
    return {
      success: false,
      error: 'Failed to fetch classes',
    };
  }
}

/**
 * Leave a class (students only)
 */
export async function leaveClass(classId: string): Promise<ActionResult> {
  try {
    const session = await auth();

    if (!session?.user || session.user.role !== 'STUDENT') {
      return { success: false, error: 'Not authorized' };
    }

    // Delete membership
    await db.classMembership.delete({
      where: {
        classId_userId: {
          classId,
          userId: session.user.id,
        },
      },
    });

    revalidatePath('/dashboard');

    return { success: true, data: undefined };
  } catch (error) {
    console.error('Leave class error:', error);
    return {
      success: false,
      error: 'Failed to leave class',
    };
  }
}
