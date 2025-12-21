import { db } from '../lib/db';

/**
 * Update vector indexes to support text-embedding-3-large (3072 dimensions)
 * and add full-text search for BM25 hybrid retrieval
 */
async function updateVectorIndexes() {
  try {
    console.log('🔧 Updating vector indexes for enhanced RAG...\n');

    // Step 1: Drop old vector index (if exists)
    console.log('1. Dropping old vector index (1536 dimensions)...');
    try {
      await db.$executeRawUnsafe(`
        DROP INDEX IF EXISTS "FileChunk_embedding_idx";
      `);
      console.log('   ✓ Old index dropped');
    } catch {
      console.log('   ⚠ No existing index to drop');
    }

    // Step 2: Create new IVFFlat vector index for 3072 dimensions
    console.log('\n2. Creating new vector index (3072 dimensions)...');
    await db.$executeRawUnsafe(`
      CREATE INDEX IF NOT EXISTS "FileChunk_embedding_idx"
      ON "FileChunk"
      USING ivfflat (embedding vector_cosine_ops)
      WITH (lists = 100);
    `);
    console.log('   ✓ Vector index created (IVFFlat with 100 lists)');

    // Step 3: Create GIN index for full-text search (BM25)
    console.log('\n3. Creating full-text search index for BM25...');

    // First, add tsvector column if it doesn't exist
    await db.$executeRawUnsafe(`
      ALTER TABLE "FileChunk"
      ADD COLUMN IF NOT EXISTS content_tsv tsvector
      GENERATED ALWAYS AS (to_tsvector('english', content)) STORED;
    `);
    console.log('   ✓ Added tsvector column');

    // Create GIN index on tsvector column
    await db.$executeRawUnsafe(`
      CREATE INDEX IF NOT EXISTS "FileChunk_content_tsv_idx"
      ON "FileChunk"
      USING GIN (content_tsv);
    `);
    console.log('   ✓ GIN index created for full-text search');

    // Step 4: Create composite indexes for fast filtering
    console.log('\n4. Creating composite indexes...');

    await db.$executeRawUnsafe(`
      CREATE INDEX IF NOT EXISTS "FileChunk_class_type_idx"
      ON "FileChunk" ("classId", "chunkType");
    `);
    console.log('   ✓ Composite index (classId + chunkType) created');

    // Step 5: Verify indexes
    console.log('\n5. Verifying indexes...');
    const indexes = await db.$queryRawUnsafe<Array<{ indexname: string; indexdef: string }>>(`
      SELECT indexname, indexdef
      FROM pg_indexes
      WHERE tablename = 'FileChunk'
      ORDER BY indexname;
    `);

    console.log('   Current indexes on FileChunk:');
    indexes.forEach((idx) => {
      console.log(`   - ${idx.indexname}`);
    });

    console.log('\n✅ Vector indexes updated successfully!');
    console.log('\n📊 System is now ready for:');
    console.log('   • Parent-child hierarchical chunking');
    console.log('   • 3072-dimension embeddings (text-embedding-3-large)');
    console.log('   • Hybrid search (Vector + BM25)');
    console.log('   • Enhanced metadata (page numbers, sections, images)\n');

  } catch (error) {
    console.error('❌ Error updating indexes:', error);
    throw error;
  } finally {
    await db.$disconnect();
  }
}

// Run the update
updateVectorIndexes()
  .catch((error) => {
    console.error('Fatal error:', error);
    process.exit(1);
  });
