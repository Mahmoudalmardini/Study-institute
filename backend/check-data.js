const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function checkData() {
  try {
    console.log('=== CHECKING SUBMISSIONS ===');
    const submissions = await prisma.submission.findMany({
      include: {
        homework: true,
        student: {
          include: { user: true }
        }
      }
    });
    console.log('Total submissions:', submissions.length);
    
    submissions.forEach((sub, i) => {
      console.log(`${i+1}. ID: ${sub.id}`);
      console.log(`   Status: ${sub.status}`);
      console.log(`   Review Status: ${sub.reviewStatus}`);
      console.log(`   Teacher Eval: ${sub.teacherEvaluation}`);
      console.log(`   Admin Eval: ${sub.adminEvaluation}`);
      console.log(`   Student: ${sub.student.user.firstName} ${sub.student.user.lastName}`);
      console.log(`   Homework: ${sub.homework.title}`);
      console.log('---');
    });
    
    console.log('\n=== CHECKING USERS ===');
    const users = await prisma.user.findMany({
      select: { id: true, firstName: true, lastName: true, role: true }
    });
    console.log('Users:', users.length);
    users.forEach(u => console.log(`- ${u.firstName} ${u.lastName} (${u.role})`));
    
  } catch (error) {
    console.error('Error:', error.message);
  } finally {
    await prisma.$disconnect();
  }
}

async function getStudentId() {
  try {
    const student = await prisma.student.findFirst({
      where: { user: { firstName: 'khaled' } },
      include: { user: true }
    });
    console.log('Student found:');
    console.log('Student ID:', student.id);
    console.log('User ID:', student.userId);
    console.log('Name:', student.user.firstName, student.user.lastName);
  } catch (error) {
    console.error('Error:', error.message);
  } finally {
    await prisma.$disconnect();
  }
}

getStudentId();
