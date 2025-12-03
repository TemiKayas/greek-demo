import { db } from '../lib/db';

async function verifySchema() {
  try {
    console.log('Verifying database schema...\n');

    // Get all tables
    const tables = await db.$queryRawUnsafe<any[]>(`
      SELECT table_name
      FROM information_schema.tables
      WHERE table_schema = 'public'
      AND table_type = 'BASE TABLE'
      ORDER BY table_name;
    `);

    console.log('📊 Tables in database:');
    tables.forEach((table) => {
      console.log(`  ✓ ${table.table_name}`);
    });

    // Check if expected tables exist
    const expectedTables = [
      'User',
      'Class',
      'ClassMembership',
      'InviteCode',
      'ClassFile',
      'FileChunk',
      'ChatConversation',
      'ChatMessage',
    ];

    const actualTableNames = tables.map((t) => t.table_name);
    const missingTables = expectedTables.filter(
      (t) => !actualTableNames.includes(t)
    );

    console.log('\n📋 Expected tables verification:');
    expectedTables.forEach((table) => {
      const exists = actualTableNames.includes(table);
      console.log(`  ${exists ? '✓' : '✗'} ${table}`);
    });

    if (missingTables.length > 0) {
      console.log('\n⚠️  Missing tables:', missingTables);
    }

    // Check removed tables (should not exist)
    const removedTables = [
      'Lesson',
      'LessonClass',
      'Material',
      'ClassMaterial',
      'PDF',
      'ProcessedContent',
      'Packet',
      'PacketItem',
      'PacketVersion',
      'PacketOpenTab',
      'WorksheetSubmission',
    ];

    const stillExistingOldTables = removedTables.filter((t) =>
      actualTableNames.includes(t)
    );

    console.log('\n🗑️  Old tables removed:');
    removedTables.forEach((table) => {
      const removed = !actualTableNames.includes(table);
      console.log(`  ${removed ? '✓' : '✗'} ${table}`);
    });

    if (stillExistingOldTables.length > 0) {
      console.log('\n⚠️  Old tables still exist:', stillExistingOldTables);
    }

    // Check FileChunk indexes
    console.log('\n🔍 FileChunk indexes:');
    const indexes = await db.$queryRawUnsafe<any[]>(`
      SELECT indexname, indexdef
      FROM pg_indexes
      WHERE tablename = 'FileChunk';
    `);

    indexes.forEach((idx) => {
      console.log(`  ✓ ${idx.indexname}`);
    });

    // Count records in each table
    console.log('\n📈 Record counts:');
    for (const table of expectedTables) {
      if (actualTableNames.includes(table)) {
        const result = await db.$queryRawUnsafe<any[]>(
          `SELECT COUNT(*) as count FROM "${table}";`
        );
        console.log(`  ${table}: ${result[0].count} records`);
      }
    }

    console.log('\n✅ Schema verification complete!');
  } catch (error) {
    console.error('Error verifying schema:', error);
  } finally {
    await db.$disconnect();
  }
}

verifySchema();
