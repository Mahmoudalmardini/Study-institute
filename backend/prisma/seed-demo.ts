import { PrismaClient, Role, Teacher } from '@prisma/client';
import * as bcrypt from 'bcrypt';

// Dev-only demo data. Deliberately separate from seed.ts, which start.sh runs on every production deploy.
const prisma = new PrismaClient();

async function upsertUser(email: string, password: string, role: Role, firstName: string, lastName: string) {
  const hashed = await bcrypt.hash(password, 10);
  return prisma.user.upsert({
    where: { email },
    update: { password: hashed, role, firstName, lastName, isActive: true },
    create: { email, password: hashed, role, firstName, lastName },
  });
}

async function findOrCreateSubject(name: string, code: string, description: string) {
  return (
    (await prisma.subject.findFirst({ where: { code } })) ??
    prisma.subject.create({ data: { name, code, description } })
  );
}

async function main() {
  if (process.env.NODE_ENV === 'production') {
    throw new Error('seed-demo refuses to run with NODE_ENV=production');
  }

  const admin = await prisma.user.findUnique({ where: { email: 'admin' } });
  if (!admin) throw new Error('Run the main seed first (npm run seed) so the admin user exists');
  const by = admin.id;

  await upsertUser('supervisor', 'super123', Role.SUPERVISOR, 'روز', 'الخليل');

  const teacherDefs = [
    { email: 'teacher', firstName: 'أحمد', lastName: 'الحسن', specialization: 'الرياضيات' },
    { email: 'teacher2', firstName: 'سارة', lastName: 'العلي', specialization: 'اللغة الإنجليزية' },
  ];
  const teachers: Teacher[] = [];
  for (const t of teacherDefs) {
    const user = await upsertUser(t.email, 'teacher123', Role.TEACHER, t.firstName, t.lastName);
    teachers.push(
      await prisma.teacher.upsert({
        where: { userId: user.id },
        update: { specialization: t.specialization },
        create: { userId: user.id, specialization: t.specialization },
      }),
    );
  }

  const klass =
    (await prisma.class.findFirst({ where: { name: 'الصف التاسع - أ' } })) ??
    (await prisma.class.create({
      data: { name: 'الصف التاسع - أ', grade: '9', academicYear: '2026-2027', teacherId: teachers[0].id },
    }));

  const subjects = [
    await findOrCreateSubject('الرياضيات', 'MATH-9', 'رياضيات الصف التاسع'),
    await findOrCreateSubject('اللغة الإنجليزية', 'ENG-9', 'لغة إنجليزية للصف التاسع'),
  ];

  for (const [i, subject] of subjects.entries()) {
    await prisma.classSubject.upsert({
      where: { classId_subjectId: { classId: klass.id, subjectId: subject.id } },
      update: {},
      create: { classId: klass.id, subjectId: subject.id, monthlyInstallment: 50, assignedBy: by },
    });
    const teacher = teachers[i];
    const linked = await prisma.teacherSubject.findFirst({ where: { teacherId: teacher.id, subjectId: subject.id } });
    if (!linked) {
      await prisma.teacherSubject.create({ data: { teacherId: teacher.id, subjectId: subject.id, assignedBy: by } });
    }
  }

  const studentDefs = [
    { email: 'student', firstName: 'محمد', lastName: 'الخليل' },
    { email: 'student2', firstName: 'ليان', lastName: 'الأحمد' },
    { email: 'student3', firstName: 'يوسف', lastName: 'السيد' },
  ];
  for (const s of studentDefs) {
    const user = await upsertUser(s.email, 'student123', Role.STUDENT, s.firstName, s.lastName);
    const student = await prisma.student.upsert({
      where: { userId: user.id },
      update: { classId: klass.id },
      create: { userId: user.id, classId: klass.id, parentPhone: '0900000000' },
    });
    await prisma.studentClass.upsert({
      where: { studentId_classId: { studentId: student.id, classId: klass.id } },
      update: {},
      create: { studentId: student.id, classId: klass.id, assignedBy: by },
    });
    for (const [i, subject] of subjects.entries()) {
      await prisma.studentSubject.upsert({
        where: { studentId_subjectId: { studentId: student.id, subjectId: subject.id } },
        update: { teacherId: teachers[i].id },
        create: { studentId: student.id, subjectId: subject.id, teacherId: teachers[i].id, enrolledBy: by },
      });
      await prisma.studentTeacher.upsert({
        where: { studentId_teacherId: { studentId: student.id, teacherId: teachers[i].id } },
        update: {},
        create: { studentId: student.id, teacherId: teachers[i].id, assignedBy: by },
      });
    }
  }

  console.log('Demo data ready:');
  console.table([
    { role: 'ADMIN', username: 'admin', password: 'admin123' },
    { role: 'SUPERVISOR', username: 'supervisor', password: 'super123' },
    { role: 'TEACHER', username: 'teacher / teacher2', password: 'teacher123' },
    { role: 'STUDENT', username: 'student / student2 / student3', password: 'student123' },
  ]);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
