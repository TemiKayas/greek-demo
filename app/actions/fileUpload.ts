'use server';

import { auth } from '@/lib/auth';
import { db } from '@/lib/db';
import { put, del } from '@vercel/blob';
import { extractText } from '@/lib/extractors/text-extractor';
import { chunkText } from '@/lib/chunking/text-chunker';
import { embedBatch } from '@/lib/openai';
import { revalidatePath } from 'next/cache';

// Types
type ActionResult<T = void> =
  | { success: true; data: T }
  | { success: false; error: string };

/**
 * Upload a file to a class and process it in the background
 * @param classId - Class ID to upload file to
 * @param formData - Form data containing the file
 * @returns File ID if successful
 */
export async function uploadClassFile(
  classId: string,
  formData: FormData
): Promise<ActionResult<{ fileId: string }>> {
  try {
    const session = await auth();

    if (!session?.user || session.user.role !== 'TEACHER') {
      return { success: false, error: 'Only teachers can upload files' };
    }

    // Verify class ownership
    const classRecord = await db.class.findUnique({
      where: { id: classId },
    });

    if (!classRecord || classRecord.teacherId !== session.user.id) {
      return { success: false, error: 'Class not found or unauthorized' };
    }

    const file = formData.get('file') as File;

    if (!file) {
      return { success: false, error: 'No file provided' };
    }

    // Validate file type
    const supportedTypes = [
      'application/pdf',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'text/plain',
    ];

    if (!supportedTypes.includes(file.type)) {
      return {
        success: false,
        error: 'Unsupported file type. Please upload PDF, DOCX, or TXT files.',
      };
    }

    // Validate file size (25MB limit)
    const maxSize = 25 * 1024 * 1024; // 25MB
    if (file.size > maxSize) {
      return {
        success: false,
        error: 'File too large. Maximum size is 25MB.',
      };
    }

    // Upload to Vercel Blob
    const blob = await put(`class-files/${classId}/${file.name}`, file, {
      access: 'public',
      addRandomSuffix: true,
    });

    // Create file record in database
    const classFile = await db.classFile.create({
      data: {
        classId,
        fileName: file.name,
        fileType: file.type,
        fileSize: file.size,
        blobUrl: blob.url,
        uploadedBy: session.user.id,
        status: 'PENDING',
      },
    });

    // Start background processing (non-blocking)
    processFileInBackground(classFile.id).catch((error) => {
      console.error('Background processing error:', error);
    });

    revalidatePath(`/classes/${classId}`);

    return {
      success: true,
      data: { fileId: classFile.id },
    };
  } catch (error) {
    console.error('Upload file error:', error);
    return {
      success: false,
      error: 'Failed to upload file. Please try again.',
    };
  }
}

/**
 * Process file in background: extract text, chunk, embed, store
 * This runs asynchronously after file upload
 * @param fileId - File ID to process
 */
async function processFileInBackground(fileId: string): Promise<void> {
  try {
    console.log(`[File Processing] Starting processing for file ${fileId}`);

    // Update status to PROCESSING
    await db.classFile.update({
      where: { id: fileId },
      data: { status: 'PROCESSING' },
    });

    // Get file record
    const file = await db.classFile.findUnique({
      where: { id: fileId },
    });

    if (!file) {
      throw new Error('File not found');
    }

    console.log(`[File Processing] Downloading file from blob: ${file.fileName}`);

    // Download file from Vercel Blob
    const response = await fetch(file.blobUrl);
    if (!response.ok) {
      throw new Error('Failed to download file from blob storage');
    }

    const arrayBuffer = await response.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    console.log(`[File Processing] Extracting text from ${file.fileName}`);

    // Extract text from file
    const text = await extractText(buffer, file.fileType);

    if (!text || text.trim().length === 0) {
      throw new Error('No text could be extracted from the file');
    }

    console.log(
      `[File Processing] Extracted ${text.length} characters, chunking text...`
    );

    // Chunk the text
    const chunks = chunkText(text);

    if (chunks.length === 0) {
      throw new Error('No chunks generated from text');
    }

    console.log(
      `[File Processing] Created ${chunks.length} chunks, embedding...`
    );

    // Embed all chunks (in batches)
    const chunkContents = chunks.map((c) => c.content);
    const embeddings = await embedBatch(chunkContents);

    console.log(`[File Processing] Embedded ${embeddings.length} chunks, storing in database...`);

    // Store chunks with embeddings in database
    // Use a transaction to ensure all chunks are saved together
    await db.$transaction(async (tx) => {
      for (let i = 0; i < chunks.length; i++) {
        const chunk = chunks[i];
        const embedding = embeddings[i];

        // Store chunk with embedding using raw SQL to handle vector type
        await tx.$executeRaw`
          INSERT INTO "FileChunk" (
            id,
            "fileId",
            "classId",
            content,
            embedding,
            "chunkIndex",
            metadata,
            "createdAt"
          )
          VALUES (
            gen_random_uuid()::text,
            ${fileId},
            ${file.classId},
            ${chunk.content},
            ${embedding}::vector,
            ${chunk.index},
            ${JSON.stringify(chunk.metadata)}::jsonb,
            NOW()
          )
        `;
      }
    });

    console.log(`[File Processing] Successfully processed ${file.fileName}`);

    // Update status to COMPLETED
    await db.classFile.update({
      where: { id: fileId },
      data: { status: 'COMPLETED' },
    });

    console.log(`[File Processing] Completed processing for file ${fileId}`);
  } catch (error) {
    console.error(`[File Processing] Error processing file ${fileId}:`, error);

    // Update status to FAILED with error message
    await db.classFile.update({
      where: { id: fileId },
      data: {
        status: 'FAILED',
        errorMessage:
          error instanceof Error ? error.message : 'Unknown error occurred',
      },
    });
  }
}

/**
 * Get all files for a class
 * @param classId - Class ID
 * @returns List of files with status
 */
export async function getClassFiles(
  classId: string
): Promise<ActionResult<any[]>> {
  try {
    const session = await auth();

    if (!session?.user) {
      return { success: false, error: 'Not authenticated' };
    }

    // Verify access (teacher owns class OR student is member)
    if (session.user.role === 'TEACHER') {
      const classRecord = await db.class.findUnique({
        where: { id: classId },
      });

      if (!classRecord || classRecord.teacherId !== session.user.id) {
        return { success: false, error: 'Unauthorized' };
      }
    } else if (session.user.role === 'STUDENT') {
      const membership = await db.classMembership.findUnique({
        where: {
          classId_userId: {
            classId,
            userId: session.user.id,
          },
        },
      });

      if (!membership) {
        return { success: false, error: 'Unauthorized' };
      }
    }

    // Get files
    const files = await db.classFile.findMany({
      where: { classId },
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        fileName: true,
        fileType: true,
        fileSize: true,
        blobUrl: true,
        status: true,
        errorMessage: true,
        createdAt: true,
        _count: {
          select: {
            chunks: true,
          },
        },
      },
    });

    return { success: true, data: files };
  } catch (error) {
    console.error('Get class files error:', error);
    return {
      success: false,
      error: 'Failed to fetch files',
    };
  }
}

/**
 * Delete a file and its chunks
 * @param fileId - File ID to delete
 */
export async function deleteClassFile(
  fileId: string
): Promise<ActionResult> {
  try {
    const session = await auth();

    if (!session?.user || session.user.role !== 'TEACHER') {
      return { success: false, error: 'Only teachers can delete files' };
    }

    // Get file with class info
    const file = await db.classFile.findUnique({
      where: { id: fileId },
      include: { class: true },
    });

    if (!file) {
      return { success: false, error: 'File not found' };
    }

    // Verify ownership
    if (file.class.teacherId !== session.user.id) {
      return { success: false, error: 'Unauthorized' };
    }

    // Delete from Vercel Blob
    try {
      await del(file.blobUrl);
    } catch (error) {
      console.error('Error deleting from blob:', error);
      // Continue even if blob deletion fails
    }

    // Delete from database (cascades to chunks)
    await db.classFile.delete({
      where: { id: fileId },
    });

    revalidatePath(`/classes/${file.classId}`);

    return { success: true, data: undefined };
  } catch (error) {
    console.error('Delete file error:', error);
    return {
      success: false,
      error: 'Failed to delete file',
    };
  }
}

/**
 * Retry processing a failed file
 * @param fileId - File ID to retry
 */
export async function retryFileProcessing(
  fileId: string
): Promise<ActionResult> {
  try {
    const session = await auth();

    if (!session?.user || session.user.role !== 'TEACHER') {
      return { success: false, error: 'Only teachers can retry processing' };
    }

    // Get file with class info
    const file = await db.classFile.findUnique({
      where: { id: fileId },
      include: { class: true },
    });

    if (!file) {
      return { success: false, error: 'File not found' };
    }

    // Verify ownership
    if (file.class.teacherId !== session.user.id) {
      return { success: false, error: 'Unauthorized' };
    }

    // Only retry failed files
    if (file.status !== 'FAILED') {
      return {
        success: false,
        error: 'Can only retry failed files',
      };
    }

    // Reset status and clear error
    await db.classFile.update({
      where: { id: fileId },
      data: {
        status: 'PENDING',
        errorMessage: null,
      },
    });

    // Start background processing
    processFileInBackground(fileId).catch((error) => {
      console.error('Retry processing error:', error);
    });

    revalidatePath(`/classes/${file.classId}`);

    return { success: true, data: undefined };
  } catch (error) {
    console.error('Retry processing error:', error);
    return {
      success: false,
      error: 'Failed to retry processing',
    };
  }
}
