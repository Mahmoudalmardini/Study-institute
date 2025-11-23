import {
  Injectable,
  NotFoundException,
  ForbiddenException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateEvaluationDto } from './dto/create-evaluation.dto';
import { UpdateEvaluationDto } from './dto/update-evaluation.dto';
import { PaginationResponse } from '../../common/interfaces/pagination-response.interface';

@Injectable()
export class EvaluationsService {
  constructor(private prisma: PrismaService) {}

  async create(teacherUserId: string, dto: CreateEvaluationDto) {
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

    const evaluation = await this.prisma.evaluation.create({
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

    return evaluation;
  }

  async findAll(
    studentId?: string,
    academicYear?: string,
    term?: string,
    page: number = 1,
    limit: number = 20,
  ): Promise<PaginationResponse<any>> {
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

    const skip = (page - 1) * limit;

    const [data, total] = await Promise.all([
      this.prisma.evaluation.findMany({
        where,
        skip,
        take: limit,
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
      }),
      this.prisma.evaluation.count({ where }),
    ]);

    return {
      data,
      meta: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async findOne(id: string) {
    const evaluation = await this.prisma.evaluation.findUnique({
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

    if (!evaluation) {
      throw new NotFoundException('Evaluation not found');
    }

    return evaluation;
  }

  async getMyEvaluations(studentUserId: string) {
    const student = await this.prisma.student.findUnique({
      where: { userId: studentUserId },
    });

    if (!student) {
      throw new NotFoundException('Student profile not found');
    }

    return this.findAll(student.id);
  }

  async update(id: string, teacherUserId: string, dto: UpdateEvaluationDto) {
    const evaluation = await this.prisma.evaluation.findUnique({
      where: { id },
      include: { teacher: true },
    });

    if (!evaluation) {
      throw new NotFoundException('Evaluation not found');
    }

    // Check if the teacher owns this evaluation
    if (evaluation.teacher.userId !== teacherUserId) {
      throw new ForbiddenException(
        'You can only update evaluations you created',
      );
    }

    const updatedEvaluation = await this.prisma.evaluation.update({
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

    return updatedEvaluation;
  }

  async remove(id: string, teacherUserId: string) {
    const evaluation = await this.prisma.evaluation.findUnique({
      where: { id },
      include: { teacher: true },
    });

    if (!evaluation) {
      throw new NotFoundException('Evaluation not found');
    }

    // Check if the teacher owns this evaluation
    if (evaluation.teacher.userId !== teacherUserId) {
      throw new ForbiddenException(
        'You can only delete evaluations you created',
      );
    }

    await this.prisma.evaluation.delete({
      where: { id },
    });

    return { message: 'Evaluation deleted successfully' };
  }
}
