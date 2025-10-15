'use server';

import { auth } from '@/lib/auth';
import { db } from '@/lib/db';
import { uploadPDF } from '@/lib/blob';
import { extractTextFromPDF, validatePDF } from '@/lib/processors/pdf-processor';
import { generateQuiz } from '@/lib/processors/ai-generator';
import { redirect } from 'next/navigation';

type ActionResult<T> =
  | { success: true; data: T }
  | { success: false; error: string };

export async function uploadAndProcessPDF(
  formData: FormData
): Promise<ActionResult<{ quizId: string; quiz: any }>> {
  try {
    // Check authentication
    const session = await auth();
    if (!session?.user || session.user.role !== 'TEACHER') {
      return { success: false, error: 'Unauthorized' };
    }

    // Get teacher profile
    const teacher = await db.teacher.findUnique({
      where: { userId: session.user.id },
    });

    if (!teacher) {
      return { success: false, error: 'Teacher profile not found' };
    }

    // Get and validate file
    const file = formData.get('pdf') as File;
    if (!file) {
      return { success: false, error: 'No file provided' };
    }

    const validation = validatePDF(file);
    if (!validation.valid) {
      return { success: false, error: validation.error! };
    }

    // Get number of questions (default 5)
    const numQuestions = parseInt(formData.get('numQuestions') as string) || 5;

    // Upload to Vercel Blob
    console.log('Uploading PDF to Vercel Blob...');
    const blobUrl = await uploadPDF(file);

    // Save PDF record
    console.log('Saving PDF record to database...');
    const pdfRecord = await db.pDF.create({
      data: {
        teacherId: teacher.id,
        filename: file.name,
        blobUrl,
        fileSize: file.size,
        mimeType: file.type,
      },
    });

    // Extract text from PDF
    console.log('Extracting text from PDF...');
    const buffer = Buffer.from(await file.arrayBuffer());
    const extractedText = await extractTextFromPDF(buffer);

    if (!extractedText || extractedText.length < 100) {
      return {
        success: false,
        error: 'Could not extract enough text from PDF. Please try a different file.',
      };
    }

    // Save processed content
    console.log('Saving processed content...');
    const processedContent = await db.processedContent.create({
      data: {
        pdfId: pdfRecord.id,
        extractedText,
        textLength: extractedText.length,
      },
    });

    // Generate quiz using Gemini
    console.log('Generating quiz with Gemini AI...');
    const quiz = await generateQuiz(extractedText, numQuestions);

    // Save quiz
    console.log('Saving quiz to database...');
    const quizRecord = await db.quiz.create({
      data: {
        processedContentId: processedContent.id,
        title: `Quiz: ${file.name}`,
        numQuestions: quiz.questions.length,
        quizJson: quiz,
      },
    });

    return {
      success: true,
      data: {
        quizId: quizRecord.id,
        quiz: quiz,
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
