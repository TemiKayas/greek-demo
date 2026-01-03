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

    // Validate file size (50MB limit)
    const maxSize = 50 * 1024 * 1024; // 50MB
    if (file.size > maxSize) {
      return {
        success: false,
        error: 'File too large. Maximum size is 50MB.',
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
 * Upload multiple files to a class with atomic transaction (all-or-nothing)
 * If any file fails, all uploads are rolled back
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
  const uploadedBlobUrls: string[] = [];
  const createdFileIds: string[] = [];

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

    console.log(`[Atomic Upload] Starting upload of ${files.length} files`);

    const supportedTypes = [
      'application/pdf',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'text/plain',
    ];

    const maxFileSize = 50 * 1024 * 1024; // 50MB per file
    const maxTotalSize = 250 * 1024 * 1024; // 250MB total

    // STEP 1: Validate ALL files before uploading anything
    console.log('[Atomic Upload] Step 1: Validating all files...');

    let totalSize = 0;
    for (const file of files) {
      // Validate file type
      if (!supportedTypes.includes(file.type)) {
        throw new Error(`File "${file.name}" has unsupported type. Please upload PDF, DOCX, or TXT files only.`);
      }

      // Validate individual file size
      if (file.size > maxFileSize) {
        throw new Error(`File "${file.name}" is too large. Maximum file size is 50MB.`);
      }

      totalSize += file.size;
    }

    // Validate total size
    if (totalSize > maxTotalSize) {
      throw new Error(`Total upload size (${(totalSize / 1024 / 1024).toFixed(2)}MB) exceeds limit of 250MB.`);
    }

    console.log(`[Atomic Upload] ✓ All files validated. Total size: ${(totalSize / 1024 / 1024).toFixed(2)}MB`);

    // STEP 2: Upload ALL files to blob storage
    console.log('[Atomic Upload] Step 2: Uploading all files to blob storage...');

    const uploadedFileData: Array<{
      file: File;
      blobUrl: string;
    }> = [];

    for (const file of files) {
      try {
        console.log(`[Atomic Upload] Uploading ${file.name} to blob...`);
        const blob = await put(`class-files/${classId}/${file.name}`, file, {
          access: 'public',
          addRandomSuffix: true,
        });

        uploadedBlobUrls.push(blob.url);
        uploadedFileData.push({
          file,
          blobUrl: blob.url,
        });

        console.log(`[Atomic Upload] ✓ ${file.name} uploaded to blob`);
      } catch (error) {
        console.error(`[Atomic Upload] Failed to upload ${file.name} to blob:`, error);
        throw new Error(`Failed to upload "${file.name}" to storage: ${error instanceof Error ? error.message : 'Unknown error'}`);
      }
    }

    console.log(`[Atomic Upload] ✓ All ${files.length} files uploaded to blob storage`);

    // STEP 3: Create ALL database records in a transaction
    console.log('[Atomic Upload] Step 3: Creating database records in transaction...');

    const uploadedFiles: Array<{ fileId: string; fileName: string }> = [];

    try {
      await db.$transaction(async (tx) => {
        for (const { file, blobUrl } of uploadedFileData) {
          const classFile = await tx.classFile.create({
            data: {
              classId,
              fileName: file.name,
              fileType: file.type,
              fileSize: file.size,
              blobUrl,
              uploadedBy: session.user.id,
              status: 'PENDING',
            },
          });

          createdFileIds.push(classFile.id);
          uploadedFiles.push({
            fileId: classFile.id,
            fileName: file.name,
          });

          console.log(`[Atomic Upload] ✓ Database record created for ${file.name}`);
        }
      });

      console.log(`[Atomic Upload] ✓ All database records created successfully`);
    } catch (error) {
      console.error('[Atomic Upload] Database transaction failed:', error);
      throw new Error(`Failed to create database records: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }

    // STEP 4: Start sequential background processing
    console.log('[Atomic Upload] Step 4: Starting sequential background processing...');

    // Process files sequentially to avoid resource contention and race conditions
    processFilesSequentially(uploadedFiles.map(f => f.fileId)).catch((error) => {
      console.error('[Atomic Upload] Sequential processing error:', error);
    });

    revalidatePath(`/classes/${classId}`);

    console.log(`[Atomic Upload] ✅ Successfully completed atomic upload of ${files.length} files`);

    return {
      success: true,
      data: {
        uploadedFiles,
        failedFiles: [] // No partial failures in atomic mode
      },
    };
  } catch (error) {
    console.error('[Atomic Upload] Error occurred, rolling back...', error);

    // ROLLBACK: Delete all uploaded blobs
    if (uploadedBlobUrls.length > 0) {
      console.log(`[Atomic Upload] Deleting ${uploadedBlobUrls.length} uploaded blobs...`);
      for (const blobUrl of uploadedBlobUrls) {
        try {
          await del(blobUrl);
          console.log(`[Atomic Upload] ✓ Deleted blob: ${blobUrl}`);
        } catch (delError) {
          console.error(`[Atomic Upload] Failed to delete blob ${blobUrl}:`, delError);
        }
      }
    }

    // ROLLBACK: Delete all created database records
    if (createdFileIds.length > 0) {
      console.log(`[Atomic Upload] Deleting ${createdFileIds.length} database records...`);
      try {
        await db.classFile.deleteMany({
          where: {
            id: {
              in: createdFileIds,
            },
          },
        });
        console.log(`[Atomic Upload] ✓ Deleted ${createdFileIds.length} database records`);
      } catch (delError) {
        console.error('[Atomic Upload] Failed to delete database records:', delError);
      }
    }

    const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
    console.log(`[Atomic Upload] ❌ Rollback complete. Error: ${errorMessage}`);

    return {
      success: false,
      error: `Upload failed and was rolled back: ${errorMessage}`,
    };
  }
}

/**
 * Process multiple files sequentially (one at a time)
 * This prevents race conditions and resource contention
 * @param fileIds - Array of file IDs to process
 */
async function processFilesSequentially(fileIds: string[]): Promise<void> {
  console.log(`[Sequential Processing] Starting sequential processing of ${fileIds.length} files...`);

  for (let i = 0; i < fileIds.length; i++) {
    const fileId = fileIds[i];
    console.log(`[Sequential Processing] Processing file ${i + 1}/${fileIds.length}: ${fileId}`);

    try {
      await processFileInBackground(fileId);
      console.log(`[Sequential Processing] ✓ File ${i + 1}/${fileIds.length} completed`);
    } catch (error) {
      console.error(`[Sequential Processing] ✗ File ${i + 1}/${fileIds.length} failed:`, error);
      // Continue with next file even if this one fails
    }
  }

  console.log(`[Sequential Processing] All files processed!`);
}

/**
 * Process file in background with RAG 2.0: Hierarchical chunking + page extraction
 * This runs asynchronously after file upload
 * @param fileId - File ID to process
 */
async function processFileInBackground(fileId: string): Promise<void> {
  try {
    console.log(`[RAG 2.0 Processing] Starting processing for file ${fileId}`);

    // IMPORTANT: Delete any existing chunks for this file to avoid duplicates
    console.log(`[RAG 2.0 Processing] Checking for existing chunks...`);
    const existingChunks = await db.fileChunk.count({
      where: { fileId },
    });

    if (existingChunks > 0) {
      console.log(`[RAG 2.0 Processing] Found ${existingChunks} existing chunks. Deleting...`);
      await db.fileChunk.deleteMany({
        where: { fileId },
      });
      console.log(`[RAG 2.0 Processing] ✓ Deleted ${existingChunks} existing chunks`);
    }

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
      const pdfResult = await extractPDFWithPages(buffer, fileId);

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

    // Count chunks before deletion (for logging)
    const chunkCount = await db.fileChunk.count({
      where: { fileId },
    });

    console.log(`[Delete File] Deleting file: ${file.fileName}`);
    console.log(`[Delete File]   - File ID: ${fileId}`);
    console.log(`[Delete File]   - Blob URL: ${file.blobUrl}`);
    console.log(`[Delete File]   - Chunks to delete: ${chunkCount}`);

    // Delete from Vercel Blob
    try {
      await del(file.blobUrl);
      console.log(`[Delete File] ✓ Deleted from blob storage`);
    } catch (error) {
      console.error('[Delete File] ✗ Error deleting from blob:', error);
      // Continue even if blob deletion fails
    }

    // Delete from database (cascades to chunks via schema.prisma:162)
    await db.classFile.delete({
      where: { id: fileId },
    });

    // Verify chunks were deleted
    const remainingChunks = await db.fileChunk.count({
      where: { fileId },
    });

    console.log(`[Delete File] ✓ Deleted from database`);
    console.log(`[Delete File] ✓ Cascade deleted ${chunkCount} chunks (${remainingChunks} remaining - should be 0)`);

    if (remainingChunks > 0) {
      console.error(`[Delete File] ⚠️ WARNING: ${remainingChunks} chunks still exist after cascade delete!`);
      // Force delete remaining chunks
      await db.fileChunk.deleteMany({
        where: { fileId },
      });
      console.log(`[Delete File] ✓ Force deleted remaining chunks`);
    }

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

    console.log(`[Retry] Deleting old chunks for file ${fileId}...`);

    // Delete all existing chunks to avoid duplicate key errors
    await db.fileChunk.deleteMany({
      where: { fileId },
    });

    console.log(`[Retry] Old chunks deleted. Resetting file status...`);

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
