import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { PaginationResponse } from '../../common/interfaces/pagination-response.interface';

@Injectable()
export class TeachersService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll(
    page: number = 1,
    limit: number = 20,
  ): Promise<PaginationResponse<any>> {
    const skip = (page - 1) * limit;

    const [data, total] = await Promise.all([
      this.prisma.teacher.findMany({
        skip,
        take: limit,
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
                  classSubjects: {
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
      }),
      this.prisma.teacher.count(),
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
                classSubjects: {
                  include: {
                    class: true,
                  },
                },
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
                classSubjects: {
                  include: {
                    class: true,
                  },
                },
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
            classSubjects: {
              include: {
                class: true,
              },
            },
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

  async getMyStudents(userId: string) {
    // Resolve teacher by userId
    const teacher = await this.prisma.teacher.findUnique({
      where: { userId },
      select: { id: true },
    });

    if (!teacher) {
      throw new NotFoundException('Teacher not found');
    }

    // Find classes owned by this teacher
    const ownedClasses = await this.prisma.class.findMany({
      where: { teacherId: teacher.id },
      select: { id: true, name: true },
    });

    // Find classes where the teacher teaches a subject (via TeacherSubject -> Subject.classId)
    const taughtSubjects = await this.prisma.teacherSubject.findMany({
      where: { teacherId: teacher.id },
      select: { subject: { select: { classId: true } } },
    });

    const classIds = Array.from(
      new Set([
        ...ownedClasses.map((c) => c.id),
        ...taughtSubjects
          .map((ts) => ts.subject?.classId)
          .filter((id): id is string => Boolean(id)),
      ]),
    );

    // Prepare OR conditions
    const orConditions: any[] = [
      {
        teachers: {
          some: {
            teacherId: teacher.id
          }
        }
      },
      {
        subjects: {
          some: {
            teacherId: teacher.id
          }
        }
      }
    ];

    if (classIds.length > 0) {
      orConditions.push({ classId: { in: classIds } });
      orConditions.push({
        classes: {
          some: {
            classId: { in: classIds },
          },
        },
      });
    }

    // Students either directly assigned to those classes, or via StudentClass junction,
    // or via direct teacher assignment, or via subject assignment with this teacher
    const students = await this.prisma.student.findMany({
      where: {
        OR: orConditions,
      },
      select: {
        id: true,
        classId: true,
        class: {
          select: {
            name: true,
          },
        },
        user: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
          },
        },
        classes: {
          select: {
            class: {
              select: {
                id: true,
                name: true,
              },
            },
          },
        },
      },
      orderBy: {
        user: {
          firstName: 'asc',
        },
      },
    });

    // Normalize to include class names array
    return students.map((s) => ({
      id: s.id,
      userId: s.user.id,
      firstName: s.user.firstName,
      lastName: s.user.lastName,
      email: s.user.email,
      classNames: [
        ...(s.class?.name ? [s.class.name] : []),
        ...s.classes.map((sc) => sc.class?.name).filter((n): n is string => Boolean(n)),
      ],
    }));
  }
}

