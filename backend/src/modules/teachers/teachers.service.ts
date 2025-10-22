import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class TeachersService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll() {
    return this.prisma.teacher.findMany({
      include: {
        user: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
            phone: true,
          },
        },
        subjects: {
          include: {
            subject: {
              include: {
                class: {
                  select: {
                    id: true,
                    name: true,
                    grade: true,
                  },
                },
              },
            },
          },
        },
        _count: {
          select: {
            subjects: true,
            students: true,
          },
        },
      },
      orderBy: {
        hireDate: 'desc',
      },
    });
  }

  async findOne(id: string) {
    const teacher = await this.prisma.teacher.findUnique({
      where: { id },
      include: {
        user: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
            phone: true,
          },
        },
        subjects: {
          include: {
            subject: {
              include: {
                class: true,
              },
            },
          },
        },
      },
    });

    if (!teacher) {
      throw new NotFoundException(`Teacher with ID ${id} not found`);
    }

    return teacher;
  }

  async findByUserId(userId: string) {
    const teacher = await this.prisma.teacher.findUnique({
      where: { userId },
      include: {
        user: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
            phone: true,
          },
        },
        subjects: {
          include: {
            subject: {
              include: {
                class: true,
              },
            },
          },
        },
      },
    });

    if (!teacher) {
      throw new NotFoundException('Teacher not found');
    }

    return teacher;
  }

  async getTeacherSubjects(teacherId: string) {
    await this.findOne(teacherId); // Validate teacher exists

    return this.prisma.teacherSubject.findMany({
      where: { teacherId },
      include: {
        subject: {
          include: {
            class: true,
            _count: {
              select: {
                students: true,
              },
            },
          },
        },
      },
    });
  }
}

