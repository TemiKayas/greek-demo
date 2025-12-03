import { db } from '../lib/db';

async function createVectorIndex() {
  try {
    console.log('Creating vector index on FileChunk.embedding...');

    // Create IVFFlat index for fast approximate nearest neighbor search
    // lists = 100 is good for up to ~1M vectors
    await db.$executeRawUnsafe(`
      CREATE INDEX IF NOT EXISTS file_chunk_embedding_idx
      ON "FileChunk"
      USING ivfflat (embedding vector_cosine_ops)
      WITH (lists = 100);
    `);

    console.log('✓ Vector index created successfully!');

    // Verify index was created
    const result = await db.$queryRawUnsafe(`
      SELECT indexname, indexdef
      FROM pg_indexes
      WHERE tablename = 'FileChunk'
      AND indexname = 'file_chunk_embedding_idx';
    `);

    console.log('✓ Verification:', result);

  } catch (error) {
    console.error('Error creating vector index:', error);
  } finally {
    await db.$disconnect();
  }
}

createVectorIndex();
