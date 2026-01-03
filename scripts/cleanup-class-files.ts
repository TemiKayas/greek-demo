/**
 * Cleanup script to delete all files and chunks from a class
 * Run with: npx tsx scripts/cleanup-class-files.ts
 */

import { db } from '../lib/db';
import { del } from '@vercel/blob';

const CLASS_ID = 'cmjpwtz5v00021imra4xp7ne2';
const FILE_ID = 'cmjxfjcqt00018ol77pu7uya4'; // Optional: clean up specific file

async function cleanupClassFiles() {
  console.log(`🧹 Cleaning up all files for class ${CLASS_ID}...`);

  try {
    // Get all files for the class
    const files = await db.classFile.findMany({
      where: { classId: CLASS_ID },
      select: {
        id: true,
        fileName: true,
        blobUrl: true,
        status: true,
        _count: {
          select: { chunks: true },
        },
      },
    });

    console.log(`Found ${files.length} files to delete`);

    // Delete each file
    for (const file of files) {
      console.log(`\n📄 Deleting: ${file.fileName}`);
      console.log(`   Status: ${file.status}, Chunks: ${file._count.chunks}`);

      // Delete from blob storage
      try {
        await del(file.blobUrl);
        console.log(`   ✓ Deleted from blob storage`);
      } catch (error) {
        console.error(`   ✗ Failed to delete blob:`, error);
      }

      // Delete from database (cascades to chunks)
      try {
        await db.classFile.delete({
          where: { id: file.id },
        });
        console.log(`   ✓ Deleted from database (including ${file._count.chunks} chunks)`);
      } catch (error) {
        console.error(`   ✗ Failed to delete from database:`, error);
      }
    }

    console.log(`\n✅ Cleanup complete! Deleted ${files.length} files.`);
  } catch (error) {
    console.error('❌ Cleanup failed:', error);
    process.exit(1);
  }
}

cleanupClassFiles();
