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

    // Fetch subjects taught by this teacher
    const taughtSubjectIds = await this.prisma.teacherSubject.findMany({
      where: { teacherId: teacher.id },
      select: { 
        subjectId: true,
        subject: {
          select: {
            name: true,
            classId: true,
            class: {
              select: {
                name: true
              }
            }
          }
        }
      },
    });

    const subjectIds = taughtSubjectIds.map(ts => ts.subjectId);

    // Prepare query conditions - focus on specific subject-class relationships
    // We want students who are ENROLLED in subjects TAUGHT BY THIS TEACHER
    const whereCondition: any = {
      subjects: {
        some: {
          subjectId: { in: subjectIds },
          // Optionally check for direct teacher assignment in StudentSubject if applicable
          // OR if the teacher teaches this subject globally (via TeacherSubject)
        }
      }
    };

    // If we want to be more specific: only show students who are taking a subject 
    // that THIS teacher is assigned to teach.
    
    // 1. Students who have a StudentSubject record where teacherId is THIS teacher
    // 2. OR Students who have a StudentSubject record for a subject where THIS teacher is assigned via TeacherSubject
    
    const students = await this.prisma.student.findMany({
      where: {
        OR: [
          // Direct assignment: Student assigned to this teacher
          {
            teachers: {
              some: {
                teacherId: teacher.id
              }
            }
          },
          // Subject assignment: Student taking a subject taught by this teacher
          {
            subjects: {
              some: {
                subjectId: { in: subjectIds }
              }
            }
          }
        ]
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
        subjects: {
          where: {
            subjectId: { in: subjectIds }
          },
          select: {
            subject: {
              select: {
                id: true,
                name: true,
                class: {
                  select: {
                    name: true
                  }
                }
              }
            }
          }
        }
      },
      orderBy: {
        user: {
          firstName: 'asc',
        },
      },
    });

    // Normalize to include class names array and relevant subjects
    return students.map((s) => {
      // Get subjects relevant to this teacher
      const relevantSubjects = s.subjects.map(ss => ({
        id: ss.subject.id,
        name: ss.subject.name,
        className: ss.subject.class?.name
      }));

      // Deduplicate class names using a Set
      const classNamesSet = new Set<string>();
      if (s.class?.name) {
        classNamesSet.add(s.class.name);
      }
      s.classes.forEach((sc) => {
        if (sc.class?.name) {
          classNamesSet.add(sc.class.name);
        }
      });
      
      // Also add class names from the subjects if they belong to a class
      s.subjects.forEach((ss) => {
        if (ss.subject?.class?.name) {
          classNamesSet.add(ss.subject.class.name);
        }
      });

      return {
        id: s.id,
        userId: s.user.id,
        firstName: s.user.firstName,
        lastName: s.user.lastName,
        email: s.user.email,
        classNames: Array.from(classNamesSet),
        // Add the subjects this student has with this teacher
        subjects: relevantSubjects
      };
    });
  }
}

