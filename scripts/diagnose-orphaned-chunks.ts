/**
 * Diagnostic script to find orphaned chunks
 * Run with: npx tsx scripts/diagnose-orphaned-chunks.ts
 */

import { db } from '../lib/db';

const FILE_ID = 'cmjxfjcqt00018ol7';

async function diagnoseOrphanedChunks() {
  console.log(`🔍 Diagnosing orphaned chunks...`);

  try {
    // Search for chunks with IDs starting with this pattern
    const specificChunks = await db.fileChunk.findMany({
      where: {
        id: {
          startsWith: `child_${FILE_ID}`,
        },
      },
      select: {
        id: true,
        fileId: true,
        chunkType: true,
        file: {
          select: {
            id: true,
            fileName: true,
            status: true,
          },
        },
      },
    });

    console.log(`\nFound ${specificChunks.length} chunks with ID pattern "child_${FILE_ID}*"`);

    if (specificChunks.length > 0) {
      console.log('\nSpecific file chunks:');
      for (const chunk of specificChunks) {
        console.log(`  - ${chunk.id}`);
        console.log(`    fileId: ${chunk.fileId}`);
        console.log(`    type: ${chunk.chunkType}`);
        console.log(`    file: ${chunk.file?.fileName || 'NULL'} (${chunk.file?.status || 'DELETED'})`);
        console.log('');
      }

      // Check if any of these chunks have no associated file
      const withoutFile = specificChunks.filter(c => !c.file);
      console.log(`\n${withoutFile.length} chunks have no associated file (orphaned)`);

      // Offer to delete them
      console.log('\nDeleting specific pattern chunks...');
      const deleteResult = await db.fileChunk.deleteMany({
        where: {
          id: {
            startsWith: `child_${FILE_ID}`,
          },
        },
      });
      console.log(`✅ Deleted ${deleteResult.count} chunks`);
    } else {
      console.log('✅ No chunks found with that pattern');
    }

    // Also check for ANY orphaned chunks in the database (chunks without files)
    console.log('\n🔍 Checking for ALL orphaned chunks in database...');

    // Get all file IDs that exist
    const existingFileIds = await db.classFile.findMany({
      select: { id: true },
    });
    const fileIdSet = new Set(existingFileIds.map(f => f.id));

    // Get all chunks
    const allChunks = await db.fileChunk.findMany({
      select: { id: true, fileId: true },
    });

    // Find orphaned chunks (chunks whose fileId doesn't exist)
    const orphanedChunks = allChunks.filter(chunk => !fileIdSet.has(chunk.fileId));

    console.log(`Found ${orphanedChunks.length} total orphaned chunks (out of ${allChunks.length} total chunks)`);

    if (orphanedChunks.length > 0) {
      console.log('Sample orphaned chunk IDs:');
      orphanedChunks.slice(0, 10).forEach(c => {
        console.log(`  - ${c.id} (fileId: ${c.fileId})`);
      });

      console.log('\nDeleting ALL orphaned chunks...');
      const orphanedIds = orphanedChunks.map(c => c.id);
      const deleteAllResult = await db.fileChunk.deleteMany({
        where: {
          id: { in: orphanedIds },
        },
      });
      console.log(`✅ Deleted ${deleteAllResult.count} total orphaned chunks`);
    }

  } catch (error) {
    console.error('❌ Diagnostic failed:', error);
    process.exit(1);
  }
}

diagnoseOrphanedChunks();
