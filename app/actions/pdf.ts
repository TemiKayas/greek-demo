'use server';

import { db } from '@/lib/db';
import { uploadPDF } from '@/lib/blob';
import { extractTextFromPDF, validatePDF } from '@/lib/processors/pdf-processor';

type ActionResult<T> =
  | { success: true; data: T }
  | { success: false; error: string };

export async function uploadAndProcessPDF(
  formData: FormData
): Promise<ActionResult<{ pdfId: string; extractedText: string }>> {
  try {
    // Get and validate file
    const file = formData.get('pdf') as File;
    if (!file) {
      return { success: false, error: 'No file provided' };
    }

    // Get optional lessonId
    const lessonId = formData.get('lessonId') as string | null;

    const validation = validatePDF(file);
    if (!validation.valid) {
      return { success: false, error: validation.error! };
    }

    // Get authenticated user (required for production)
    const { auth } = await import('@/lib/auth');
    const session = await auth();

    if (!session?.user) {
      return { success: false, error: 'Not authenticated' };
    }

    const userId = session.user.id;

    // Upload to local filesystem
    console.log('Saving PDF to local filesystem...');
    const filePath = await uploadPDF(file);

    // Save PDF record
    console.log('Saving PDF record to database...');
    const pdfRecord = await db.pDF.create({
      data: {
        userId,
        filename: file.name,
        blobUrl: filePath, // Updated field name to match schema
        fileSize: file.size,
        mimeType: file.type,
        lessonId: lessonId || null, // Link to lesson if provided
      },
    });

    // Extract text from PDF
    console.log('Extracting text from PDF...');
    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    const extractedText = await extractTextFromPDF(buffer);

    if (!extractedText || extractedText.length < 100) {
      return {
        success: false,
        error: 'Could not extract enough text from PDF. Please try a different file.',
      };
    }

    // Save processed content
    console.log('Saving processed content...');
    await db.processedContent.create({
      data: {
        pdfId: pdfRecord.id,
        extractedText,
        textLength: extractedText.length,
      },
    });

    return {
      success: true,
      data: {
        pdfId: pdfRecord.id,
        extractedText: extractedText.substring(0, 500) + '...', // Return preview
      },
    };
  } catch (error) {
    console.error('PDF processing error:', error);
    return {
      success: false,
      error:
        error instanceof Error
          ? error.message
          : 'Failed to process PDF. Please try again.',
    };
  }
}

export async function getAllPDFs() {
  try {
    const pdfs = await db.pDF.findMany({
      include: {
        processedContent: true,
        materials: true,
      },
      orderBy: {
        uploadedAt: 'desc',
      },
    });

    return { success: true, data: pdfs };
  } catch (error) {
    console.error('Error fetching PDFs:', error);
    return { success: false, error: 'Failed to fetch PDFs' };
  }
}

export async function getLessonPDFs(lessonId: string) {
  try {
    const { auth } = await import('@/lib/auth');
    const session = await auth();

    if (!session?.user) {
      return { success: false, error: 'Not authenticated' };
    }

    // Verify user has access to this lesson
    const lesson = await db.lesson.findUnique({
      where: { id: lessonId },
      include: {
        classes: {
          include: {
            class: {
              include: {
                memberships: {
                  where: { userId: session.user.id },
                },
              },
            },
          },
        },
      },
    });

    if (!lesson) {
      return { success: false, error: 'Lesson not found' };
    }

    // Check if user is creator or has access through a class
    const hasAccess =
      lesson.creatorId === session.user.id ||
      lesson.classes.some((lc) => lc.class.memberships.length > 0);

    if (!hasAccess) {
      return { success: false, error: 'Access denied' };
    }

    const pdfs = await db.pDF.findMany({
      where: { lessonId },
      include: {
        processedContent: true,
        materials: true,
      },
      orderBy: {
        uploadedAt: 'desc',
      },
    });

    return { success: true, data: pdfs };
  } catch (error) {
    console.error('Error fetching lesson PDFs:', error);
    return { success: false, error: 'Failed to fetch lesson PDFs' };
  }
}

export async function deletePDF(pdfId: string): Promise<ActionResult<void>> {
  try {
    // Get the PDF record to find the file path
    const pdf = await db.pDF.findUnique({
      where: { id: pdfId },
    });

    if (!pdf) {
      return { success: false, error: 'PDF not found' };
    }

    // Delete the file from blob storage
    const { deletePDF: deleteFile } = await import('@/lib/blob');
    await deleteFile(pdf.blobUrl);

    // Delete from database (cascade will handle related records)
    await db.pDF.delete({
      where: { id: pdfId },
    });

    return { success: true, data: undefined };
  } catch (error) {
    console.error('Error deleting PDF:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to delete PDF',
    };
  }
}
