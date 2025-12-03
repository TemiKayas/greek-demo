import { db } from '../lib/db';

async function enablePgvector() {
  try {
    console.log('Enabling pgvector extension...');

    // Enable pgvector extension
    await db.$executeRawUnsafe('CREATE EXTENSION IF NOT EXISTS vector;');

    console.log('✓ pgvector extension enabled successfully!');

    // Verify it's enabled
    const result = await db.$queryRawUnsafe(`
      SELECT * FROM pg_extension WHERE extname = 'vector';
    `);

    console.log('✓ Verification:', result);

  } catch (error) {
    console.error('Error enabling pgvector:', error);
    console.log('\nIf this fails, you may need to enable it manually in the Vercel Postgres dashboard.');
    console.log('Go to: https://vercel.com/dashboard → Storage → Your Database → Query tab');
    console.log('Run: CREATE EXTENSION IF NOT EXISTS vector;');
  } finally {
    await db.$disconnect();
  }
}

enablePgvector();
