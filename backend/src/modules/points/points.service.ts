import { Injectable, ForbiddenException, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class PointsService {
	constructor(private readonly prisma: PrismaService) {}

	private async assertTeacherCanModifyStudent(teacherUserId: string, studentId: string): Promise<void> {
		const teacher = await this.prisma.teacher.findUnique({ where: { userId: teacherUserId }, select: { id: true } });
		if (!teacher) throw new ForbiddenException('Not a teacher');

		// classes owned by teacher
		const ownedClassIds = (
			await this.prisma.class.findMany({ where: { teacherId: teacher.id }, select: { id: true } })
		).map((c) => c.id);

		// classes via taught subjects
		const taughtSubjectClassIds = (
			await this.prisma.teacherSubject.findMany({ where: { teacherId: teacher.id }, select: { subject: { select: { classId: true } } } })
		)
			.map((ts) => ts.subject?.classId)
			.filter((v): v is string => Boolean(v));

		const classIds = new Set<string>([...ownedClassIds, ...taughtSubjectClassIds]);
		if (classIds.size === 0) throw new ForbiddenException('No classes');

		// check student membership
		const s = await this.prisma.student.findUnique({
			where: { id: studentId },
			select: { classId: true, classes: { select: { classId: true } } },
		});
		if (!s) throw new NotFoundException('Student not found');
		if (s.classId && classIds.has(s.classId)) return;
		if (s.classes.some((sc) => classIds.has(sc.classId))) return;
		throw new ForbiddenException('Teacher not responsible for this student');
	}

	async createTransaction(requestor: { role: string; id: string }, payload: { studentId: string; subjectId?: string | null; amount: number }) {
		const { studentId, subjectId, amount } = payload;
		if (!Number.isInteger(amount) || amount === 0) {
			throw new ForbiddenException('Amount must be non-zero integer');
		}

		// authorization
		if (requestor.role === 'TEACHER') {
			await this.assertTeacherCanModifyStudent(requestor.id, studentId);
		}
		// ADMIN/SUPERVISOR allowed; STUDENT not allowed to create
		if (requestor.role === 'STUDENT') {
			throw new ForbiddenException('Students cannot modify points');
		}

		return this.prisma.pointTransaction.create({
			data: {
				studentId,
				subjectId: subjectId ?? null,
				amount,
			},
		});
	}

	async getSummaryForStudent(studentId: string, dateISO?: string) {
		const date = dateISO ? new Date(dateISO) : new Date();
		const start = new Date(date);
		start.setHours(0, 0, 0, 0);
		const end = new Date(start);
		end.setDate(end.getDate() + 1);

		// totals by subject
		const [totalBySubject, dailyBySubject] = await Promise.all([
			this.prisma.pointTransaction.groupBy({
				by: ['subjectId'],
				where: { studentId },
				_sum: { amount: true },
			}),
			this.prisma.pointTransaction.groupBy({
				by: ['subjectId'],
				where: { studentId, createdAt: { gte: start, lt: end } },
				_sum: { amount: true },
			}),
		]);

		const subjectIds = Array.from(
			new Set([
				...totalBySubject.map((r) => r.subjectId).filter((v): v is string => Boolean(v)),
				...dailyBySubject.map((r) => r.subjectId).filter((v): v is string => Boolean(v)),
			]),
		);
		const subjects = await this.prisma.subject.findMany({ where: { id: { in: subjectIds } }, select: { id: true, name: true } });
		const idToName = new Map(subjects.map((s) => [s.id, s.name] as const));

		let total = 0;
		let daily = 0;
		const bySubject = Array.from(new Set([...subjectIds, null as unknown as string]))
			.filter((id) => id !== (null as unknown as string))
			.map((sid) => {
				const t = totalBySubject.find((r) => r.subjectId === sid)?._sum.amount ?? 0;
				const d = dailyBySubject.find((r) => r.subjectId === sid)?._sum.amount ?? 0;
				total += t;
				daily += d;
				return { subjectId: sid, subjectName: idToName.get(sid!) || 'General', total: t, daily: d };
			});

		// also include general (null subject) bucket
		const tGeneral = totalBySubject.find((r) => r.subjectId === null)?._sum.amount ?? 0;
		const dGeneral = dailyBySubject.find((r) => r.subjectId === null)?._sum.amount ?? 0;
		total += tGeneral;
		daily += dGeneral;
		if (tGeneral !== 0 || dGeneral !== 0) {
			bySubject.unshift({ subjectId: null, subjectName: 'General', total: tGeneral, daily: dGeneral } as any);
		}

		return { total, daily, bySubject };
	}

	async listTransactions(studentId: string, limit = 50, cursor?: string | null) {
		return this.prisma.pointTransaction.findMany({
			where: { studentId },
			orderBy: { createdAt: 'desc' },
			take: limit,
			...(cursor ? { skip: 1, cursor: { id: cursor } } : {}),
			select: { id: true, subjectId: true, amount: true, createdAt: true, subject: { select: { name: true } } },
		});
	}

  async resolveStudentIdForUser(userId: string): Promise<string> {
    const student = await this.prisma.student.findUnique({ where: { userId }, select: { id: true } });
    if (!student) throw new NotFoundException('Student not found');
    return student.id;
  }

  async getBatchSummaries(studentIds: string[], dateISO?: string): Promise<Record<string, { total: number; daily: number; bySubject: { subjectId: string | null; subjectName: string; total: number; daily: number }[] }>> {
    if (studentIds.length === 0) return {};
    
    const date = dateISO ? new Date(dateISO) : new Date();
    const start = new Date(date);
    start.setHours(0, 0, 0, 0);
    const end = new Date(start);
    end.setDate(end.getDate() + 1);

    // Fetch all transactions for all students in parallel
    const [totalBySubject, dailyBySubject] = await Promise.all([
      this.prisma.pointTransaction.groupBy({
        by: ['studentId', 'subjectId'],
        where: { studentId: { in: studentIds } },
        _sum: { amount: true },
      }),
      this.prisma.pointTransaction.groupBy({
        by: ['studentId', 'subjectId'],
        where: { 
          studentId: { in: studentIds },
          createdAt: { gte: start, lt: end }
        },
        _sum: { amount: true },
      }),
    ]);

    // Get all unique subject IDs
    const subjectIds = Array.from(
      new Set([
        ...totalBySubject.map((r) => r.subjectId).filter((v): v is string => Boolean(v)),
        ...dailyBySubject.map((r) => r.subjectId).filter((v): v is string => Boolean(v)),
      ]),
    );

    // Fetch subject names in one query
    const subjects = subjectIds.length > 0
      ? await this.prisma.subject.findMany({ 
          where: { id: { in: subjectIds } }, 
          select: { id: true, name: true } 
        })
      : [];
    const idToName = new Map(subjects.map((s) => [s.id, s.name] as const));

    // Build result map
    const result: Record<string, { total: number; daily: number; bySubject: { subjectId: string | null; subjectName: string; total: number; daily: number }[] }> = {};

    for (const studentId of studentIds) {
      const studentTotalBySubject = totalBySubject.filter(r => r.studentId === studentId);
      const studentDailyBySubject = dailyBySubject.filter(r => r.studentId === studentId);

      const studentSubjectIds = Array.from(
        new Set([
          ...studentTotalBySubject.map((r) => r.subjectId).filter((v): v is string => Boolean(v)),
          ...studentDailyBySubject.map((r) => r.subjectId).filter((v): v is string => Boolean(v)),
        ]),
      );

      let total = 0;
      let daily = 0;
      const bySubject = studentSubjectIds.map((sid) => {
        const t = studentTotalBySubject.find((r) => r.subjectId === sid)?._sum.amount ?? 0;
        const d = studentDailyBySubject.find((r) => r.subjectId === sid)?._sum.amount ?? 0;
        total += t;
        daily += d;
        return { subjectId: sid, subjectName: idToName.get(sid!) || 'General', total: t, daily: d };
      });

      // Include general (null subject) bucket
      const tGeneral = studentTotalBySubject.find((r) => r.subjectId === null)?._sum.amount ?? 0;
      const dGeneral = studentDailyBySubject.find((r) => r.subjectId === null)?._sum.amount ?? 0;
      total += tGeneral;
      daily += dGeneral;
      if (tGeneral !== 0 || dGeneral !== 0) {
        bySubject.unshift({ subjectId: null, subjectName: 'General', total: tGeneral, daily: dGeneral } as any);
      }

      result[studentId] = { total, daily, bySubject };
    }

    return result;
  }
}
