const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function checkUsers() {
  const teachers = await prisma.user.findMany({
    where: { role: 'TEACHER' },
    select: {
      id: true,
      email: true,
      firstName: true,
      lastName: true,
      role: true,
    }
  });
  
  console.log('Teachers in database:');
  teachers.forEach(t => {
    console.log(`  - ${t.firstName} ${t.lastName}`);
    console.log(`    Email: ${t.email}`);
    console.log(`    ID: ${t.id}`);
    console.log('');
  });
  
  await prisma.$disconnect();
}

checkUsers().catch(e => {
  console.error('Error:', e);
  process.exit(1);
});

