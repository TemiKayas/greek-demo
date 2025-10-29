const { PrismaClient } = require('@prisma/client');
const { hash } = require('bcryptjs');

const prisma = new PrismaClient();

async function main() {
  console.log('Creating admin user...');

  // Hash the password
  const passwordHash = await hash('password', 12);

  // Check if user exists
  const existing = await prisma.user.findUnique({
    where: { email: 'admin@example.com' }
  });

  if (existing) {
    console.log('User already exists! Updating password...');
    await prisma.user.update({
      where: { email: 'admin@example.com' },
      data: { passwordHash }
    });
    console.log('✅ Password updated!');
  } else {
    // Create new user
    const user = await prisma.user.create({
      data: {
        email: 'admin@example.com',
        name: 'Admin User',
        passwordHash,
        role: 'TEACHER'
      }
    });
    console.log('✅ Admin user created!');
    console.log('Email:', user.email);
    console.log('Role:', user.role);
  }

  console.log('\nYou can now log in with:');
  console.log('Email: admin@example.com');
  console.log('Password: password');
}

main()
  .catch((e) => {
    console.error('Error:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
