const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function checkData() {
  console.log('\n=== CHECKING DATABASE ===\n');
  
  // Check submissions
  const submissions = await prisma.submission.findMany({
    include: {
      homework: {
        include: {
          teacher: {
            include: {
              user: {
                select: {
                  id: true,
                  firstName: true,
                  lastName: true,
                  email: true,
                }
              }
            }
          }
        }
      },
      student: {
        include: {
          user: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              email: true,
            }
          }
        }
      }
    }
  });
  
  console.log(`Found ${submissions.length} submissions:`);
  submissions.forEach((sub, i) => {
    console.log(`\nSubmission ${i + 1}:`);
    console.log(`  ID: ${sub.id}`);
    console.log(`  Homework: ${sub.homework.title}`);
    console.log(`  Student: ${sub.student.user.firstName} ${sub.student.user.lastName}`);
    console.log(`  Teacher: ${sub.homework.teacher.user.firstName} ${sub.homework.teacher.user.lastName}`);
    console.log(`  Teacher ID (profile): ${sub.homework.teacherId}`);
    console.log(`  Teacher ID (user): ${sub.homework.teacher.userId}`);
    console.log(`  Submitted: ${sub.submittedAt}`);
    console.log(`  Status: ${sub.status}`);
    console.log(`  File URLs: ${JSON.stringify(sub.fileUrls)}`);
    console.log(`  Number of files: ${sub.fileUrls?.length || 0}`);
  });
  
  // Check all teachers
  const teachers = await prisma.teacher.findMany({
    include: {
      user: {
        select: {
          id: true,
          firstName: true,
          lastName: true,
          email: true,
        }
      }
    }
  });
  
  console.log(`\n=== TEACHERS ===`);
  console.log(`Found ${teachers.length} teachers:`);
  teachers.forEach((t, i) => {
    console.log(`  ${i + 1}. ${t.user.firstName} ${t.user.lastName}`);
    console.log(`     Profile ID: ${t.id}`);
    console.log(`     User ID: ${t.userId}`);
  });
  
  await prisma.$disconnect();
}

checkData().catch(e => {
  console.error('Error:', e);
  process.exit(1);
});

