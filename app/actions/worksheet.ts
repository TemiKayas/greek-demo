'use server';

import { db } from '@/lib/db';
import { auth } from '@/lib/auth';
import { z } from 'zod';
import { del } from '@vercel/blob';

const GetWorksheetsSchema = z.object({
  classId: z.string(),
});

export async function getWorksheetsForClass(classId: string) {
  try {
    const session = await auth();
    if (!session?.user) {
      return { success: false, error: 'Unauthorized' };
    }

    const validatedData = GetWorksheetsSchema.safeParse({ classId });
    if (!validatedData.success) {
      return { success: false, error: 'Invalid input' };
    }

    const worksheets = await db.worksheet.findMany({
      where: {
        classId: validatedData.data.classId,
        createdBy: session.user.id,
      },
      orderBy: {
        createdAt: 'desc',
      },
    });

    return { success: true, data: worksheets };
  } catch (error) {
    console.error('Error getting worksheets:', error);
    return { success: false, error: 'Failed to get worksheets' };
  }
}


const GetWorksheetsForStudentSchema = z.object({
  classId: z.string(),
});

export async function getWorksheetsForStudent(classId: string) {
    try {
        const session = await auth();
        if (!session?.user) {
            return { success: false, error: 'Unauthorized' };
        }

        const validatedData = GetWorksheetsForStudentSchema.safeParse({ classId });
        if (!validatedData.success) {
            return { success: false, error: 'Invalid input' };
        }

        const membership = await db.classMembership.findFirst({
            where: {
                classId: validatedData.data.classId,
                userId: session.user.id,
            },
        });

        if (!membership) {
            return { success: false, error: 'You are not a member of this class' };
        }

        const worksheets = await db.worksheet.findMany({
            where: {
                classId: validatedData.data.classId,
            },
            orderBy: {
                createdAt: 'desc',
            },
        });

        return { success: true, data: worksheets };
    } catch (error) {
        console.error('Error getting worksheets for student:', error);
        return { success: false, error: 'Failed to get worksheets' };
    }
}

export async function submitWorksheet(worksheetId: string, answers: Record<number, string>) {
    try {
        const session = await auth();
        if (!session?.user || session.user.role !== 'STUDENT') {
            return { success: false, error: 'Unauthorized' };
        }

        // Validate input
        if (!worksheetId || typeof worksheetId !== 'string') {
            return { success: false, error: 'Invalid worksheet ID' };
        }

        if (!answers || typeof answers !== 'object') {
            return { success: false, error: 'Invalid answers format' };
        }

        const worksheet = await db.worksheet.findUnique({
            where: { id: worksheetId },
            select: { classId: true }
        });

        if (!worksheet) {
            return { success: false, error: 'Worksheet not found' };
        }

        const membership = await db.classMembership.findFirst({
            where: {
                classId: worksheet.classId,
                userId: session.user.id,
            },
        });

        if (!membership) {
            return { success: false, error: 'You are not a member of this class' };
        }

        // Convert answers object to JSON-compatible format
        const answersJson = JSON.parse(JSON.stringify(answers));

        await db.worksheetSubmission.upsert({
            where: {
                worksheetId_studentId: {
                    worksheetId: worksheetId,
                    studentId: session.user.id,
                },
            },
            update: {
                answers: answersJson,
                submittedAt: new Date(),
            },
            create: {
                worksheetId: worksheetId,
                studentId: session.user.id,
                answers: answersJson,
            },
        });

        return { success: true };

    } catch (error) {
        console.error('Error submitting worksheet:', error);
        return { success: false, error: 'Failed to submit worksheet' };
    }
}

const GetSubmissionsSchema = z.object({
    worksheetId: z.string(),
});

export async function getWorksheetSubmissions(worksheetId: string) {
    try {
        const session = await auth();
        if (!session?.user || session.user.role !== 'TEACHER') {
            return { success: false, error: 'Unauthorized' };
        }

        const validatedData = GetSubmissionsSchema.safeParse({ worksheetId });
        if (!validatedData.success) {
            return { success: false, error: 'Invalid input' };
        }

        const worksheet = await db.worksheet.findUnique({
            where: { id: validatedData.data.worksheetId },
            select: { classId: true, createdBy: true },
        });

        if (!worksheet || worksheet.createdBy !== session.user.id) {
            return { success: false, error: 'Worksheet not found or you are not the creator' };
        }

        const submissions = await db.worksheetSubmission.findMany({
            where: {
                worksheetId: validatedData.data.worksheetId,
            },
            include: {
                student: {
                    select: {
                        name: true,
                        email: true,
                    },
                },
            },
            orderBy: {
                submittedAt: 'desc',
            },
        });

        return { success: true, data: submissions };

    } catch (error) {
        console.error('Error getting submissions:', error);
        return { success: false, error: 'Failed to get submissions' };
    }
}

const DeleteWorksheetSchema = z.object({
    worksheetId: z.string(),
});

export async function deleteWorksheet(worksheetId: string) {
    try {
        const session = await auth();
        if (!session?.user || session.user.role !== 'TEACHER') {
            return { success: false, error: 'Unauthorized' };
        }

        const validatedData = DeleteWorksheetSchema.safeParse({ worksheetId });
        if (!validatedData.success) {
            return { success: false, error: 'Invalid input' };
        }

        // Get worksheet with submissions count
        const worksheet = await db.worksheet.findUnique({
            where: { id: validatedData.data.worksheetId },
            include: {
                _count: {
                    select: { submissions: true },
                },
            },
        });

        if (!worksheet || worksheet.createdBy !== session.user.id) {
            return { success: false, error: 'Worksheet not found or you are not the creator' };
        }

        console.log(`[Delete Worksheet] Deleting worksheet: ${worksheet.title}`);
        console.log(`[Delete Worksheet]   - Worksheet ID: ${worksheetId}`);
        console.log(`[Delete Worksheet]   - File URL: ${worksheet.filePath}`);
        console.log(`[Delete Worksheet]   - Submissions to delete: ${worksheet._count.submissions}`);

        // Delete from Vercel Blob
        try {
            await del(worksheet.filePath);
            console.log(`[Delete Worksheet] ✓ Deleted from blob storage`);
        } catch (error) {
            console.error('[Delete Worksheet] ✗ Error deleting from blob:', error);
            // Continue even if blob deletion fails
        }

        // Delete from database (cascades to submissions via schema.prisma)
        await db.worksheet.delete({
            where: { id: validatedData.data.worksheetId },
        });

        console.log(`[Delete Worksheet] ✓ Deleted from database`);
        console.log(`[Delete Worksheet] ✓ Cascade deleted ${worksheet._count.submissions} submissions`);

        return { success: true };

    } catch (error) {
        console.error('Error deleting worksheet:', error);
        return { success: false, error: 'Failed to delete worksheet' };
    }
}
