import {
  Injectable,
  NotFoundException,
  ForbiddenException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateGradeDto } from './dto/create-grade.dto';
import { UpdateGradeDto } from './dto/update-grade.dto';

@Injectable()
export class GradesService {
  constructor(private prisma: PrismaService) {}

  async create(teacherUserId: string, dto: CreateGradeDto) {
    const teacher = await this.prisma.teacher.findUnique({
      where: { userId: teacherUserId },
    });

    if (!teacher) {
      throw new NotFoundException('Teacher profile not found');
    }

    const student = await this.prisma.student.findUnique({
      where: { id: dto.studentId },
    });

    if (!student) {
      throw new NotFoundException('Student not found');
    }

    const subject = await this.prisma.subject.findUnique({
      where: { id: dto.subjectId },
    });

    if (!subject) {
      throw new NotFoundException('Subject not found');
    }

    const grade = await this.prisma.grade.create({
      data: {
        ...dto,
        teacherId: teacher.id,
      },
      include: {
        student: {
          include: {
            user: {
              select: {
                firstName: true,
                lastName: true,
              },
            },
          },
        },
        subject: true,
        teacher: {
          include: {
            user: {
              select: {
                firstName: true,
                lastName: true,
              },
            },
          },
        },
      },
    });

    return grade;
  }

  async findAll(studentId?: string, academicYear?: string, term?: string) {
    const where: any = {};

    if (studentId) {
      where.studentId = studentId;
    }

    if (academicYear) {
      where.academicYear = academicYear;
    }

    if (term) {
      where.term = term;
    }

    const grades = await this.prisma.grade.findMany({
      where,
      include: {
        student: {
          include: {
            user: {
              select: {
                firstName: true,
                lastName: true,
              },
            },
          },
        },
        subject: true,
        teacher: {
          include: {
            user: {
              select: {
                firstName: true,
                lastName: true,
              },
            },
          },
        },
      },
      orderBy: [{ academicYear: 'desc' }, { term: 'desc' }],
    });

    return grades;
  }

  async findOne(id: string) {
    const grade = await this.prisma.grade.findUnique({
      where: { id },
      include: {
        student: {
          include: {
            user: {
              select: {
                firstName: true,
                lastName: true,
                email: true,
              },
            },
          },
        },
        subject: true,
        teacher: {
          include: {
            user: {
              select: {
                firstName: true,
                lastName: true,
              },
            },
          },
        },
      },
    });

    if (!grade) {
      throw new NotFoundException('Grade not found');
    }

    return grade;
  }

  async getMyGrades(studentUserId: string) {
    const student = await this.prisma.student.findUnique({
      where: { userId: studentUserId },
    });

    if (!student) {
      throw new NotFoundException('Student profile not found');
    }

    return this.findAll(student.id);
  }

  async update(id: string, teacherUserId: string, dto: UpdateGradeDto) {
    const grade = await this.prisma.grade.findUnique({
      where: { id },
      include: { teacher: true },
    });

    if (!grade) {
      throw new NotFoundException('Grade not found');
    }

    // Check if the teacher owns this grade
    if (grade.teacher.userId !== teacherUserId) {
      throw new ForbiddenException('You can only update grades you created');
    }

    const updatedGrade = await this.prisma.grade.update({
      where: { id },
      data: dto,
      include: {
        student: {
          include: {
            user: {
              select: {
                firstName: true,
                lastName: true,
              },
            },
          },
        },
        subject: true,
        teacher: {
          include: {
            user: {
              select: {
                firstName: true,
                lastName: true,
              },
            },
          },
        },
      },
    });

    return updatedGrade;
  }

  async remove(id: string, teacherUserId: string) {
    const grade = await this.prisma.grade.findUnique({
      where: { id },
      include: { teacher: true },
    });

    if (!grade) {
      throw new NotFoundException('Grade not found');
    }

    // Check if the teacher owns this grade
    if (grade.teacher.userId !== teacherUserId) {
      throw new ForbiddenException('You can only delete grades you created');
    }

    await this.prisma.grade.delete({
      where: { id },
    });

    return { message: 'Grade deleted successfully' };
  }
}
