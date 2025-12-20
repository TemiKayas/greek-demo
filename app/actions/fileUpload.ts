'use server';

import { auth } from '@/lib/auth';
import { db } from '@/lib/db';
import { put, del } from '@vercel/blob';
import { extractText } from '@/lib/extractors/text-extractor';
import { extractPDFWithPages, detectSectionHeading } from '@/lib/extractors/pdf-extractor';
import { createHierarchicalChunks, flattenChildChunks } from '@/lib/chunking/hierarchical-chunker';
import { embedBatch, extractImageDescription } from '@/lib/openai';
import { revalidatePath } from 'next/cache';
import type { Prisma } from '@prisma/client';

// Types
type ActionResult<T = void> =
  | { success: true; data: T }
  | { success: false; error: string };

type ClassFileData = Prisma.ClassFileGetPayload<{
  select: {
    id: true;
    fileName: true;
    fileType: true;
    fileSize: true;
    blobUrl: true;
    status: true;
    errorMessage: true;
    createdAt: true;
    _count: {
      select: {
        chunks: true;
      };
    };
  };
}>;

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

    console.log(`[Upload] Starting upload for ${file.name}`);

    // Upload to Vercel Blob
    const blob = await put(`class-files/${classId}/${file.name}`, file, {
      access: 'public',
      addRandomSuffix: true,
    });

    console.log(`[Upload] Blob uploaded successfully: ${blob.url}`);

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

    console.log(`[Upload] Database record created: ${classFile.id}`);

    // Start background processing (non-blocking)
    processFileInBackground(classFile.id).catch((error) => {
      console.error('Background processing error:', error);
    });

    revalidatePath(`/classes/${classId}`);

    console.log(`[Upload] Successfully completed upload for ${file.name}`);

    return {
      success: true,
      data: { fileId: classFile.id },
    };
  } catch (error) {
    console.error('[Upload] Upload file error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
    return {
      success: false,
      error: `Failed to upload file: ${errorMessage}`,
    };
  }
}

/**
 * Upload multiple files to a class and process them in the background
 * @param classId - Class ID to upload files to
 * @param formData - Form data containing the files
 * @returns Array of file IDs and any errors
 */
export async function uploadMultipleClassFiles(
  classId: string,
  formData: FormData
): Promise<ActionResult<{
  uploadedFiles: Array<{ fileId: string; fileName: string }>;
  failedFiles: Array<{ fileName: string; error: string }>;
}>> {
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

    const files = formData.getAll('files') as File[];

    if (!files || files.length === 0) {
      return { success: false, error: 'No files provided' };
    }

    console.log(`[Multi-Upload] Starting upload of ${files.length} files`);

    const uploadedFiles: Array<{ fileId: string; fileName: string }> = [];
    const failedFiles: Array<{ fileName: string; error: string }> = [];

    const supportedTypes = [
      'application/pdf',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'text/plain',
    ];

    const maxSize = 25 * 1024 * 1024; // 25MB

    // Process each file
    for (const file of files) {
      try {
        // Validate file type
        if (!supportedTypes.includes(file.type)) {
          failedFiles.push({
            fileName: file.name,
            error: 'Unsupported file type',
          });
          continue;
        }

        // Validate file size
        if (file.size > maxSize) {
          failedFiles.push({
            fileName: file.name,
            error: 'File too large (max 25MB)',
          });
          continue;
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
          console.error(`Background processing error for ${file.name}:`, error);
        });

        uploadedFiles.push({
          fileId: classFile.id,
          fileName: file.name,
        });

        console.log(`[Multi-Upload] Successfully uploaded: ${file.name}`);
      } catch (error) {
        console.error(`[Multi-Upload] Error uploading ${file.name}:`, error);
        failedFiles.push({
          fileName: file.name,
          error: error instanceof Error ? error.message : 'Upload failed',
        });
      }
    }

    revalidatePath(`/classes/${classId}`);

    console.log(`[Multi-Upload] Completed: ${uploadedFiles.length} succeeded, ${failedFiles.length} failed`);

    return {
      success: true,
      data: { uploadedFiles, failedFiles },
    };
  } catch (error) {
    console.error('[Multi-Upload] Fatal error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
    return {
      success: false,
      error: `Failed to upload files: ${errorMessage}`,
    };
  }
}

/**
 * Process file in background with RAG 2.0: Hierarchical chunking + page extraction
 * This runs asynchronously after file upload
 * @param fileId - File ID to process
 */
async function processFileInBackground(fileId: string): Promise<void> {
  try {
    console.log(`[RAG 2.0 Processing] Starting processing for file ${fileId}`);

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

    console.log(`[RAG 2.0 Processing] Downloading file from blob: ${file.fileName}`);

    // Download file from Vercel Blob
    const response = await fetch(file.blobUrl);
    if (!response.ok) {
      throw new Error('Failed to download file from blob storage');
    }

    const arrayBuffer = await response.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    console.log(`[RAG 2.0 Processing] Extracting text from ${file.fileName}`);

    // Extract text with page-level metadata (PDF) or simple extraction (DOCX/TXT)
    let text: string;
    const pageMap: Map<number, number> = new Map(); // Maps char position to page number

    if (file.fileType === 'application/pdf') {
      console.log('[RAG 2.0 Processing] Using page-level PDF extraction...');
      const pdfResult = await extractPDFWithPages(buffer);

      // --- Parallelized Image Description Logic ---
      console.log('[File Processing] Checking for images to describe...');
      const descriptionPromises = [];

      for (const page of pdfResult.pages) {
        if (page.hasImages && page.images.length > 0) {
          for (const image of page.images) {
            const imageBuffer = Buffer.from(image.data);
            const imageBase64 = imageBuffer.toString('base64');
            // Create a promise that resolves with the description AND a reference to the page.
            // Note: The local try/catch is removed. Errors will now propagate to the main handler.
            const promise = extractImageDescription(imageBase64, page.pageNumber).then(description => ({
              description,
              page
            }));
            descriptionPromises.push(promise);
          }
        }
      }

      if (descriptionPromises.length > 0) {
        console.log(`[File Processing] Found ${descriptionPromises.length} image(s). Generating descriptions in parallel...`);

        // This will throw an error if any single promise fails, which is what we want.
        const results = await Promise.all(descriptionPromises);

        for (const result of results) {
          if (result && result.description) {
            console.log(`[File Processing] Embedding description for image on page ${result.page.pageNumber}.`);
            // Use unique markers to embed the description. It will be extracted later.
            const descriptionText = `\n\n$$IMG_DESC_START$$${result.description}$$IMG_DESC_END$$`;
            // Modify the page text directly
            result.page.text += descriptionText;
            // Also update the full text, which is used for creating parent chunks
            pdfResult.fullText += `\n\n[Image Description for Page ${result.page.pageNumber}: ${result.description}]`;
          }
        }
      }
      // --- End of Parallelized Logic ---

      // Build full text with page markers
      let currentPos = 0;
      const textParts: string[] = [];

      for (const page of pdfResult.pages) {
        const pageText = page.text;
        textParts.push(pageText);

        // Map character positions to page numbers
        for (let i = 0; i < pageText.length; i++) {
          pageMap.set(currentPos + i, page.pageNumber);
        }

        currentPos += pageText.length + 2; // +2 for \n\n separator
      }

      text = textParts.join('\n\n');
      console.log(`[RAG 2.0 Processing] Extracted ${pdfResult.totalPages} pages, ${text.length} characters`);
    } else {
      // DOCX or TXT - simple extraction
      text = await extractText(buffer, file.fileType);
      console.log(`[RAG 2.0 Processing] Extracted ${text.length} characters`);
    }

    if (!text || text.trim().length === 0) {
      throw new Error('No text could be extracted from the file');
    }

    console.log('[RAG 2.0 Processing] Creating hierarchical chunks...');

    // Create hierarchical chunk structure (parent-child)
    const hierarchicalChunks = createHierarchicalChunks(text);

    if (hierarchicalChunks.length === 0) {
      throw new Error('No chunks generated from text');
    }

    console.log(`[RAG 2.0 Processing] Created ${hierarchicalChunks.length} parent chunks`);

    // Flatten child chunks for embedding
    const childChunks = flattenChildChunks(hierarchicalChunks);

    // --- Extract Image Descriptions from Chunks into Structured Fields ---
    console.log('[File Processing] Finalizing chunk data...');
    for (const chunk of childChunks) {
      const markerRegex = /\s*\$\$IMG_DESC_START\$\$([\s\S]*?)\$\$IMG_DESC_END\$\$/g;
      const match = markerRegex.exec(chunk.content);

      if (match) {
        // Extract the description
        const description = match[1].trim();
        chunk.imageDesc = description;
        chunk.hasImages = true;

        // Clean the markers and the description itself from the main content
        chunk.content = chunk.content.replace(markerRegex, '').trim();
        console.log(`[File Processing] Moved image description to structured field for a chunk.`);
      }
    }
    // --- End of Extraction Logic ---

    console.log(`[RAG 2.0 Processing] Created ${childChunks.length} child chunks for embedding`);

    // Embed all child chunks (they're what we search on)
    const childContents = childChunks.map((c) => c.content);
    const childEmbeddings = await embedBatch(childContents);

    console.log(`[RAG 2.0 Processing] Embedded ${childEmbeddings.length} child chunks`);

    // Store all chunks in database with parent-child relationships
    console.log('[RAG 2.0 Processing] Storing chunks in database...');

    await db.$transaction(async (tx) => {
      // First, insert all parent chunks (no embeddings - we don't search these)
      const parentIdMap = new Map<number, string>(); // Map parent index to DB ID

      for (const parent of hierarchicalChunks) {
        // Detect section heading for this parent
        const section = detectSectionHeading(parent.content) || undefined;

        // Determine page number for this parent (use start position)
        const pageNumber = pageMap.get(parent.metadata.startChar) || null;

        const parentId = `parent_${fileId}_${parent.chunkIndex}`;
        parentIdMap.set(parent.chunkIndex, parentId);

        await tx.$executeRaw`
          INSERT INTO "FileChunk" (
            id,
            "fileId",
            "classId",
            content,
            embedding,
            "chunkIndex",
            "chunkType",
            "parentId",
            "pageNumber",
            section,
            topic,
            "hasImages",
            "imageDesc",
            metadata,
            "createdAt"
          )
          VALUES (
            ${parentId},
            ${fileId},
            ${file.classId},
            ${parent.content},
            NULL,
            ${parent.chunkIndex},
            'PARENT',
            NULL,
            ${pageNumber},
            ${section},
            NULL,
            false,
            NULL,
            ${JSON.stringify(parent.metadata)}::jsonb,
            NOW()
          )
        `;
      }

      // Then, insert all child chunks with embeddings and parent links
      for (let i = 0; i < childChunks.length; i++) {
        const child = childChunks[i];
        const embedding = childEmbeddings[i];
        const parentId = parentIdMap.get(child.parentIndex)!;

        // Determine page number for this child
        const pageNumber = pageMap.get(child.metadata.startChar) || null;

        const childId = `child_${fileId}_${child.chunkIndex}`;

        await tx.$executeRaw`
          INSERT INTO "FileChunk" (
            id,
            "fileId",
            "classId",
            content,
            embedding,
            "chunkIndex",
            "chunkType",
            "parentId",
            "pageNumber",
            section,
            topic,
            "hasImages",
            "imageDesc",
            metadata,
            "createdAt"
          )
          VALUES (
            ${childId},
            ${fileId},
            ${file.classId},
            ${child.content},
            ${embedding}::vector,
            ${child.chunkIndex},
            'CHILD',
            ${parentId},
            ${pageNumber},
            NULL,
            NULL,
            ${child.hasImages || false},
            ${child.imageDesc || null},
            ${JSON.stringify(child.metadata)}::jsonb,
            NOW()
          )
        `;
      }
    });

    console.log(`[RAG 2.0 Processing] Successfully processed ${file.fileName}`);
    console.log(`  - ${hierarchicalChunks.length} parent chunks (full context)`);
    console.log(`  - ${childChunks.length} child chunks (searchable)`);

    // Update status to COMPLETED
    await db.classFile.update({
      where: { id: fileId },
      data: { status: 'COMPLETED' },
    });

    console.log(`[RAG 2.0 Processing] Completed processing for file ${fileId}`);
  } catch (error) {
    console.error(`[RAG 2.0 Processing] Error processing file ${fileId}:`, error);

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
): Promise<ActionResult<ClassFileData[]>> {
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
