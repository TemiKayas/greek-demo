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

    const validation = validatePDF(file);
    if (!validation.valid) {
      return { success: false, error: validation.error! };
    }

    // Get or create default user
    let user = await db.user.findFirst();
    if (!user) {
      user = await db.user.create({
        data: {
          name: 'Demo User',
        },
      });
    }

    // Upload to local filesystem
    console.log('Saving PDF to local filesystem...');
    const filePath = await uploadPDF(file);

    // Save PDF record
    console.log('Saving PDF record to database...');
    const pdfRecord = await db.pDF.create({
      data: {
        userId: user.id,
        filename: file.name,
        filePath,
        fileSize: file.size,
        mimeType: file.type,
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
