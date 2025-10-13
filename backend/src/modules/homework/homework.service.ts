import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateHomeworkDto } from './dto/create-homework.dto';
import { UpdateHomeworkDto } from './dto/update-homework.dto';
import { CreateSubmissionDto } from './dto/create-submission.dto';
import { GradeSubmissionDto } from './dto/grade-submission.dto';
import { SubmissionStatus } from '@prisma/client';

@Injectable()
export class HomeworkService {
  constructor(private prisma: PrismaService) {}

  async create(teacherId: string, dto: CreateHomeworkDto) {
    const teacher = await this.prisma.teacher.findUnique({
      where: { userId: teacherId },
    });

    if (!teacher) {
      throw new NotFoundException('Teacher profile not found');
    }

    const classExists = await this.prisma.class.findUnique({
      where: { id: dto.classId },
    });

    if (!classExists) {
      throw new NotFoundException('Class not found');
    }

    const homework = await this.prisma.homework.create({
      data: {
        ...dto,
        teacherId: teacher.id,
      },
      include: {
        class: true,
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

    return homework;
  }

  async findAll(classId?: string, teacherId?: string) {
    const where: any = {};

    if (classId) {
      where.classId = classId;
    }

    if (teacherId) {
      const teacher = await this.prisma.teacher.findUnique({
        where: { userId: teacherId },
      });
      if (teacher) {
        where.teacherId = teacher.id;
      }
    }

    const homework = await this.prisma.homework.findMany({
      where,
      include: {
        class: true,
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
        _count: {
          select: {
            submissions: true,
          },
        },
      },
      orderBy: { dueDate: 'desc' },
    });

    return homework;
  }

  async findOne(id: string) {
    const homework = await this.prisma.homework.findUnique({
      where: { id },
      include: {
        class: true,
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
        submissions: {
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
          },
        },
      },
    });

    if (!homework) {
      throw new NotFoundException('Homework not found');
    }

    return homework;
  }

  async update(id: string, teacherId: string, dto: UpdateHomeworkDto) {
    const homework = await this.prisma.homework.findUnique({
      where: { id },
      include: { teacher: true },
    });

    if (!homework) {
      throw new NotFoundException('Homework not found');
    }

    // Check if the teacher owns this homework
    if (homework.teacher.userId !== teacherId) {
      throw new ForbiddenException('You can only update your own homework');
    }

    const updatedHomework = await this.prisma.homework.update({
      where: { id },
      data: dto,
      include: {
        class: true,
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

    return updatedHomework;
  }

  async remove(id: string, teacherId: string) {
    const homework = await this.prisma.homework.findUnique({
      where: { id },
      include: { teacher: true },
    });

    if (!homework) {
      throw new NotFoundException('Homework not found');
    }

    // Check if the teacher owns this homework
    if (homework.teacher.userId !== teacherId) {
      throw new ForbiddenException('You can only delete your own homework');
    }

    await this.prisma.homework.delete({
      where: { id },
    });

    return { message: 'Homework deleted successfully' };
  }

  // Submission methods
  async createSubmission(studentUserId: string, dto: CreateSubmissionDto) {
    const student = await this.prisma.student.findUnique({
      where: { userId: studentUserId },
    });

    if (!student) {
      throw new NotFoundException('Student profile not found');
    }

    const homework = await this.prisma.homework.findUnique({
      where: { id: dto.homeworkId },
    });

    if (!homework) {
      throw new NotFoundException('Homework not found');
    }

    // Check if student already submitted
    const existingSubmission = await this.prisma.submission.findUnique({
      where: {
        homeworkId_studentId: {
          homeworkId: dto.homeworkId,
          studentId: student.id,
        },
      },
    });

    if (existingSubmission) {
      throw new BadRequestException('You have already submitted this homework');
    }

    const isLate = new Date() > new Date(homework.dueDate);

    const submission = await this.prisma.submission.create({
      data: {
        homeworkId: dto.homeworkId,
        studentId: student.id,
        fileUrls: dto.fileUrls || [],
        submittedAt: new Date(),
        status: isLate ? SubmissionStatus.LATE : SubmissionStatus.SUBMITTED,
      },
      include: {
        homework: true,
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
      },
    });

    return submission;
  }

  async getMySubmissions(studentUserId: string, homeworkId?: string) {
    const student = await this.prisma.student.findUnique({
      where: { userId: studentUserId },
    });

    if (!student) {
      throw new NotFoundException('Student profile not found');
    }

    const where: any = {
      studentId: student.id,
    };

    if (homeworkId) {
      where.homeworkId = homeworkId;
    }

    const submissions = await this.prisma.submission.findMany({
      where,
      include: {
        homework: {
          include: {
            class: true,
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
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    return submissions;
  }

  async gradeSubmission(
    submissionId: string,
    teacherId: string,
    dto: GradeSubmissionDto,
  ) {
    const submission = await this.prisma.submission.findUnique({
      where: { id: submissionId },
      include: {
        homework: {
          include: {
            teacher: true,
          },
        },
      },
    });

    if (!submission) {
      throw new NotFoundException('Submission not found');
    }

    // Check if the teacher owns this homework
    if (submission.homework.teacher.userId !== teacherId) {
      throw new ForbiddenException(
        'You can only grade submissions for your homework',
      );
    }

    const gradedSubmission = await this.prisma.submission.update({
      where: { id: submissionId },
      data: {
        grade: dto.grade,
        feedback: dto.feedback,
        status: SubmissionStatus.GRADED,
      },
      include: {
        homework: true,
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
      },
    });

    return gradedSubmission;
  }

  async getSubmissions(homeworkId: string, teacherId?: string) {
    const homework = await this.prisma.homework.findUnique({
      where: { id: homeworkId },
      include: { teacher: true },
    });

    if (!homework) {
      throw new NotFoundException('Homework not found');
    }

    // If teacher ID is provided, verify ownership
    if (teacherId && homework.teacher.userId !== teacherId) {
      throw new ForbiddenException(
        'You can only view submissions for your homework',
      );
    }

    const submissions = await this.prisma.submission.findMany({
      where: { homeworkId },
      include: {
        student: {
          include: {
            user: {
              select: {
                id: true,
                firstName: true,
                lastName: true,
                email: true,
              },
            },
          },
        },
      },
      orderBy: { submittedAt: 'desc' },
    });

    return submissions;
  }
}
