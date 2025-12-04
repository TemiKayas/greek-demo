import { db } from '../lib/db';

/**
 * Reset database - Remove all classes, files, chats, but keep users
 * This allows starting fresh while preserving user accounts
 */
async function resetDatabase() {
  try {
    console.log('🗑️  Starting database reset...\n');

    // Delete in order to respect foreign key constraints

    console.log('Deleting chat messages...');
    const deletedMessages = await db.chatMessage.deleteMany({});
    console.log(`✓ Deleted ${deletedMessages.count} chat messages`);

    console.log('Deleting chat conversations...');
    const deletedConversations = await db.chatConversation.deleteMany({});
    console.log(`✓ Deleted ${deletedConversations.count} chat conversations`);

    console.log('Deleting file chunks (embeddings)...');
    const deletedChunks = await db.fileChunk.deleteMany({});
    console.log(`✓ Deleted ${deletedChunks.count} file chunks`);

    console.log('Deleting class files...');
    const deletedFiles = await db.classFile.deleteMany({});
    console.log(`✓ Deleted ${deletedFiles.count} class files`);

    console.log('Deleting invite codes...');
    const deletedInvites = await db.inviteCode.deleteMany({});
    console.log(`✓ Deleted ${deletedInvites.count} invite codes`);

    console.log('Deleting class memberships...');
    const deletedMemberships = await db.classMembership.deleteMany({});
    console.log(`✓ Deleted ${deletedMemberships.count} class memberships`);

    console.log('Deleting classes...');
    const deletedClasses = await db.class.deleteMany({});
    console.log(`✓ Deleted ${deletedClasses.count} classes`);

    console.log('\n📊 Summary:');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log(`Chat Messages:     ${deletedMessages.count}`);
    console.log(`Chat Conversations: ${deletedConversations.count}`);
    console.log(`File Chunks:       ${deletedChunks.count}`);
    console.log(`Class Files:       ${deletedFiles.count}`);
    console.log(`Invite Codes:      ${deletedInvites.count}`);
    console.log(`Class Memberships: ${deletedMemberships.count}`);
    console.log(`Classes:           ${deletedClasses.count}`);
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

    // Check remaining users
    const userCount = await db.user.count();
    console.log(`\n👤 Users preserved: ${userCount}`);

    console.log('\n✅ Database reset complete!');
    console.log('💡 Users can now create new classes and upload fresh materials.\n');

  } catch (error) {
    console.error('❌ Error resetting database:', error);
    throw error;
  } finally {
    await db.$disconnect();
  }
}

// Run the reset
resetDatabase()
  .catch((error) => {
    console.error('Fatal error:', error);
    process.exit(1);
  });
