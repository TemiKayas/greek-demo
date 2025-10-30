'use server';

import { z } from 'zod';
import { db } from '@/lib/db';
import { auth } from '@/lib/auth';
import { revalidatePath } from 'next/cache';

// Validation schemas
const createLessonSchema = z.object({
  name: z.string().min(1, 'Lesson name is required').max(200, 'Lesson name is too long'),
  description: z.string().max(1000, 'Description is too long').optional(),
});

const updateLessonSchema = z.object({
  name: z.string().min(1, 'Lesson name is required').max(200, 'Lesson name is too long').optional(),
  description: z.string().max(1000, 'Description is too long').optional(),
});

// Types
type ActionResult<T = void> =
  | { success: true; data: T }
  | { success: false; error: string };

/**
 * Create a new lesson (teachers only)
 */
export async function createLesson(formData: FormData): Promise<ActionResult<{ lessonId: string }>> {
  try {
    const session = await auth();

    if (!session?.user || session.user.role !== 'TEACHER') {
      return { success: false, error: 'Only teachers can create lessons' };
    }

    // Validate input
    const rawData = {
      name: formData.get('name'),
      description: formData.get('description') || '',
    };

    const validatedData = createLessonSchema.safeParse(rawData);

    if (!validatedData.success) {
      return {
        success: false,
        error: validatedData.error.issues[0]?.message || 'Invalid form data',
      };
    }

    const { name, description } = validatedData.data;

    // Create lesson
    const lesson = await db.lesson.create({
      data: {
        creatorId: session.user.id,
        name,
        description: description || null,
      },
    });

    revalidatePath('/lessons');

    return {
      success: true,
      data: { lessonId: lesson.id },
    };
  } catch (error) {
    console.error('Create lesson error:', error);
    return {
      success: false,
      error: 'Failed to create lesson. Please try again.',
    };
  }
}

/**
 * Get all lessons for the current teacher
 */
export async function getTeacherLessons(): Promise<ActionResult<any[]>> {
  try {
    const session = await auth();

    if (!session?.user || session.user.role !== 'TEACHER') {
      return { success: false, error: 'Not authorized' };
    }

    const lessons = await db.lesson.findMany({
      where: {
        creatorId: session.user.id,
      },
      include: {
        _count: {
          select: {
            classes: true,
            pdfs: true,
            materials: true,
          },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
    });

    return {
      success: true,
      data: lessons,
    };
  } catch (error) {
    console.error('Get teacher lessons error:', error);
    return {
      success: false,
      error: 'Failed to fetch lessons',
    };
  }
}

/**
 * Get lesson details
 */
export async function getLessonDetails(lessonId: string): Promise<ActionResult<any>> {
  try {
    const session = await auth();

    if (!session?.user) {
      return { success: false, error: 'Not authenticated' };
    }

    const lesson = await db.lesson.findUnique({
      where: { id: lessonId },
      include: {
        classes: {
          include: {
            class: {
              select: {
                id: true,
                name: true,
                description: true,
              },
            },
          },
        },
        pdfs: {
          include: {
            processedContent: true,
          },
          orderBy: {
            uploadedAt: 'desc',
          },
        },
        materials: {
          orderBy: {
            createdAt: 'desc',
          },
        },
        _count: {
          select: {
            classes: true,
            pdfs: true,
            materials: true,
          },
        },
      },
    });

    if (!lesson) {
      return { success: false, error: 'Lesson not found' };
    }

    // Check authorization - only creator can view for now
    if (session.user.role === 'TEACHER' && lesson.creatorId !== session.user.id) {
      return { success: false, error: 'Not authorized to view this lesson' };
    }

    return {
      success: true,
      data: lesson,
    };
  } catch (error) {
    console.error('Get lesson details error:', error);
    return {
      success: false,
      error: 'Failed to fetch lesson details',
    };
  }
}

/**
 * Update lesson information (teachers only)
 */
export async function updateLesson(
  lessonId: string,
  formData: FormData
): Promise<ActionResult> {
  try {
    const session = await auth();

    if (!session?.user || session.user.role !== 'TEACHER') {
      return { success: false, error: 'Not authorized' };
    }

    // Verify ownership
    const lesson = await db.lesson.findUnique({
      where: { id: lessonId },
    });

    if (!lesson || lesson.creatorId !== session.user.id) {
      return { success: false, error: 'Not authorized' };
    }

    // Validate input
    const rawData = {
      name: formData.get('name') || undefined,
      description: formData.get('description') || undefined,
    };

    const validatedData = updateLessonSchema.safeParse(rawData);

    if (!validatedData.success) {
      return {
        success: false,
        error: validatedData.error.issues[0]?.message || 'Invalid form data',
      };
    }

    // Update lesson
    await db.lesson.update({
      where: { id: lessonId },
      data: {
        ...validatedData.data,
        description: validatedData.data.description || null,
      },
    });

    revalidatePath('/lessons');
    revalidatePath(`/lessons/${lessonId}`);

    return { success: true, data: undefined };
  } catch (error) {
    console.error('Update lesson error:', error);
    return {
      success: false,
      error: 'Failed to update lesson',
    };
  }
}

/**
 * Delete a lesson (teachers only)
 */
export async function deleteLesson(lessonId: string): Promise<ActionResult> {
  try {
    const session = await auth();

    if (!session?.user || session.user.role !== 'TEACHER') {
      return { success: false, error: 'Not authorized' };
    }

    // Verify ownership
    const lesson = await db.lesson.findUnique({
      where: { id: lessonId },
    });

    if (!lesson || lesson.creatorId !== session.user.id) {
      return { success: false, error: 'Not authorized' };
    }

    // Delete lesson (cascade will handle related records)
    await db.lesson.delete({
      where: { id: lessonId },
    });

    revalidatePath('/lessons');

    return { success: true, data: undefined };
  } catch (error) {
    console.error('Delete lesson error:', error);
    return {
      success: false,
      error: 'Failed to delete lesson',
    };
  }
}

/**
 * Share a lesson with a class
 */
export async function shareLessonWithClass(
  lessonId: string,
  classId: string,
  order?: number
): Promise<ActionResult> {
  try {
    const session = await auth();

    if (!session?.user || session.user.role !== 'TEACHER') {
      return { success: false, error: 'Not authorized' };
    }

    // Verify ownership of both lesson and class
    const [lesson, classData] = await Promise.all([
      db.lesson.findUnique({ where: { id: lessonId } }),
      db.class.findUnique({ where: { id: classId } }),
    ]);

    if (!lesson || lesson.creatorId !== session.user.id) {
      return { success: false, error: 'Not authorized to share this lesson' };
    }

    if (!classData || classData.teacherId !== session.user.id) {
      return { success: false, error: 'Not authorized for this class' };
    }

    // Check if already shared
    const existing = await db.lessonClass.findUnique({
      where: {
        lessonId_classId: {
          lessonId,
          classId,
        },
      },
    });

    if (existing) {
      return { success: false, error: 'Lesson is already shared with this class' };
    }

    // Get the next order number if not provided
    const finalOrder =
      order ??
      (
        await db.lessonClass.count({
          where: { classId },
        })
      );

    // Share lesson with class
    await db.lessonClass.create({
      data: {
        lessonId,
        classId,
        sharedBy: session.user.id,
        order: finalOrder,
      },
    });

    revalidatePath(`/classes/${classId}`);
    revalidatePath(`/lessons/${lessonId}`);

    return { success: true, data: undefined };
  } catch (error) {
    console.error('Share lesson with class error:', error);
    return {
      success: false,
      error: 'Failed to share lesson',
    };
  }
}

/**
 * Unshare a lesson from a class
 */
export async function unshareLessonFromClass(
  lessonId: string,
  classId: string
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

    // Unshare lesson
    await db.lessonClass.delete({
      where: {
        lessonId_classId: {
          lessonId,
          classId,
        },
      },
    });

    revalidatePath(`/classes/${classId}`);
    revalidatePath(`/lessons/${lessonId}`);

    return { success: true, data: undefined };
  } catch (error) {
    console.error('Unshare lesson from class error:', error);
    return {
      success: false,
      error: 'Failed to unshare lesson',
    };
  }
}

/**
 * Get all lessons for a specific class (in order)
 */
export async function getClassLessons(classId: string): Promise<ActionResult<any[]>> {
  try {
    const session = await auth();

    if (!session?.user) {
      return { success: false, error: 'Not authenticated' };
    }

    // Verify access to class
    const isTeacher =
      session.user.role === 'TEACHER' &&
      (await db.class.findFirst({
        where: {
          id: classId,
          teacherId: session.user.id,
        },
      }));

    const isStudent =
      session.user.role === 'STUDENT' &&
      (await db.classMembership.findUnique({
        where: {
          classId_userId: {
            classId,
            userId: session.user.id,
          },
        },
      }));

    if (!isTeacher && !isStudent) {
      return { success: false, error: 'Not authorized to view this class' };
    }

    // Get lessons for this class
    const lessonClasses = await db.lessonClass.findMany({
      where: {
        classId,
      },
      include: {
        lesson: {
          include: {
            _count: {
              select: {
                pdfs: true,
                materials: true,
              },
            },
          },
        },
      },
      orderBy: {
        order: 'asc',
      },
    });

    const lessons = lessonClasses.map((lc) => ({
      ...lc.lesson,
      sharedAt: lc.sharedAt,
      order: lc.order,
    }));

    return {
      success: true,
      data: lessons,
    };
  } catch (error) {
    console.error('Get class lessons error:', error);
    return {
      success: false,
      error: 'Failed to fetch lessons',
    };
  }
}
