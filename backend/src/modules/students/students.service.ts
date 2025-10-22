import {
  Injectable,
  NotFoundException,
  ConflictException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateStudentDto } from './dto/create-student.dto';
import { UpdateStudentDto } from './dto/update-student.dto';

@Injectable()
export class StudentsService {
  constructor(private prisma: PrismaService) {}

  async create(dto: CreateStudentDto) {
    const user = await this.prisma.user.findUnique({
      where: { id: dto.userId },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    const existingStudent = await this.prisma.student.findUnique({
      where: { userId: dto.userId },
    });

    if (existingStudent) {
      throw new ConflictException(
        'Student profile already exists for this user',
      );
    }

    // Validate class exists if provided
    if (dto.classId) {
      const classExists = await this.prisma.class.findUnique({
        where: { id: dto.classId },
      });
      if (!classExists) {
        throw new NotFoundException('Class not found');
      }
    }

    // Validate subjects exist if provided
    if (dto.subjectIds && dto.subjectIds.length > 0) {
      const subjects = await this.prisma.subject.findMany({
        where: { id: { in: dto.subjectIds } },
      });
      if (subjects.length !== dto.subjectIds.length) {
        throw new NotFoundException('One or more subjects not found');
      }
    }

    const { subjectIds, ...studentData } = dto;

    const student = await this.prisma.student.create({
      data: studentData,
      include: {
        user: {
          select: {
            id: true,
            email: true,
            firstName: true,
            lastName: true,
            phone: true,
          },
        },
        class: true,
        subjects: {
          include: {
            subject: true,
          },
        },
      },
    });

    // Enroll student in subjects if provided
    if (subjectIds && subjectIds.length > 0) {
      await this.enrollSubjects(student.id, subjectIds, user.id);
    }

    return this.findOne(student.id);
  }

  async findAll(classId?: string) {
    const students = await this.prisma.student.findMany({
      where: classId ? { classId } : {},
      include: {
        user: {
          select: {
            id: true,
            email: true,
            firstName: true,
            lastName: true,
            phone: true,
          },
        },
        class: true,
        _count: {
          select: {
            subjects: true,
          },
        },
      },
      orderBy: { enrollmentDate: 'desc' },
    });

    return students;
  }

  async findOne(id: string) {
    const student = await this.prisma.student.findUnique({
      where: { id },
      include: {
        user: {
          select: {
            id: true,
            email: true,
            firstName: true,
            lastName: true,
            phone: true,
          },
        },
        class: true,
        classes: {
          include: {
            class: {
              include: {
                subjects: true,
              },
            },
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
        grades: {
          include: {
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
        },
        evaluations: {
          include: {
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
    });

    if (!student) {
      throw new NotFoundException('Student not found');
    }

    return student;
  }

  async findByUserId(userId: string) {
    let student = await this.prisma.student.findUnique({
      where: { userId },
      include: {
        user: {
          select: {
            id: true,
            email: true,
            firstName: true,
            lastName: true,
            phone: true,
          },
        },
        class: true,
      },
    });

    if (!student) {
      // Auto-create student profile if it doesn't exist
      const user = await this.prisma.user.findUnique({
        where: { id: userId },
      });

      if (!user || user.role !== 'STUDENT') {
        throw new NotFoundException('Student user not found');
      }

      // Create the student profile automatically
      student = await this.prisma.student.create({
        data: {
          userId: userId,
        },
        include: {
          user: {
            select: {
              id: true,
              email: true,
              firstName: true,
              lastName: true,
              phone: true,
            },
          },
          class: true,
        },
      });
    }

    return student;
  }

  async update(id: string, dto: UpdateStudentDto) {
    const student = await this.prisma.student.findUnique({
      where: { id },
    });

    if (!student) {
      throw new NotFoundException('Student not found');
    }

    if (dto.classId) {
      const classExists = await this.prisma.class.findUnique({
        where: { id: dto.classId },
      });

      if (!classExists) {
        throw new NotFoundException('Class not found');
      }
    }

    const updatedStudent = await this.prisma.student.update({
      where: { id },
      data: dto,
      include: {
        user: {
          select: {
            id: true,
            email: true,
            firstName: true,
            lastName: true,
            phone: true,
          },
        },
        class: true,
      },
    });

    return updatedStudent;
  }

  async remove(id: string) {
    const student = await this.prisma.student.findUnique({
      where: { id },
    });

    if (!student) {
      throw new NotFoundException('Student not found');
    }

    await this.prisma.student.delete({
      where: { id },
    });

    return { message: 'Student deleted successfully' };
  }

  async enrollSubjects(
    studentId: string,
    subjectIds: string[],
    enrolledBy: string,
  ) {
    const student = await this.findOne(studentId); // Validate student exists

    // Validate minimum 1 subject
    if (!subjectIds || subjectIds.length === 0) {
      throw new ConflictException('At least one subject must be assigned');
    }

    // Validate all subjects exist
    const subjects = await this.prisma.subject.findMany({
      where: { id: { in: subjectIds } },
      include: { class: true },
    });

    if (subjects.length !== subjectIds.length) {
      throw new NotFoundException('One or more subjects not found');
    }

    // Get student's assigned classes
    const studentClasses = await this.prisma.studentClass.findMany({
      where: { studentId },
      select: { classId: true },
    });

    const studentClassIds = studentClasses.map((sc) => sc.classId);

    // Validate subjects belong to student's assigned classes (if student has classes)
    if (studentClassIds.length > 0) {
      const invalidSubjects = subjects.filter(
        (subject) =>
          subject.classId && !studentClassIds.includes(subject.classId),
      );

      if (invalidSubjects.length > 0) {
        throw new ConflictException(
          `Some subjects do not belong to student's assigned classes: ${invalidSubjects.map((s) => s.name).join(', ')}`,
        );
      }
    }

    // Remove existing enrollments not in the new list
    await this.prisma.studentSubject.deleteMany({
      where: {
        studentId,
        subjectId: { notIn: subjectIds },
      },
    });

    // Create new enrollments (skip if already exists)
    const enrollments = await Promise.all(
      subjectIds.map(async (subjectId) => {
        const existing = await this.prisma.studentSubject.findUnique({
          where: {
            studentId_subjectId: {
              studentId,
              subjectId,
            },
          },
        });

        if (existing) {
          return existing;
        }

        return this.prisma.studentSubject.create({
          data: {
            studentId,
            subjectId,
            enrolledBy,
          },
          include: {
            subject: true,
          },
        });
      }),
    );

    return enrollments;
  }

  async assignClasses(
    studentId: string,
    classIds: string[],
    assignedBy: string,
  ) {
    await this.findOne(studentId); // Validate student exists

    // Validate all classes exist
    const classes = await this.prisma.class.findMany({
      where: { id: { in: classIds } },
    });

    if (classes.length !== classIds.length) {
      throw new NotFoundException('One or more classes not found');
    }

    // Remove existing class assignments not in the new list
    await this.prisma.studentClass.deleteMany({
      where: {
        studentId,
        classId: { notIn: classIds },
      },
    });

    // Create new class assignments (skip if already exists)
    const assignments = await Promise.all(
      classIds.map(async (classId) => {
        const existing = await this.prisma.studentClass.findUnique({
          where: {
            studentId_classId: {
              studentId,
              classId,
            },
          },
        });

        if (existing) {
          return existing;
        }

        return this.prisma.studentClass.create({
          data: {
            studentId,
            classId,
            assignedBy,
          },
          include: {
            class: true,
          },
        });
      }),
    );

    return assignments;
  }

  async getStudentClasses(studentId: string) {
    await this.findOne(studentId); // Validate student exists

    return this.prisma.studentClass.findMany({
      where: { studentId },
      include: {
        class: {
          include: {
            subjects: true,
          },
        },
      },
    });
  }

  async removeStudentClass(studentId: string, classId: string) {
    await this.findOne(studentId); // Validate student exists

    const assignment = await this.prisma.studentClass.findUnique({
      where: {
        studentId_classId: {
          studentId,
          classId,
        },
      },
    });

    if (!assignment) {
      throw new NotFoundException('Class assignment not found');
    }

    await this.prisma.studentClass.delete({
      where: {
        studentId_classId: {
          studentId,
          classId,
        },
      },
    });

    return { message: 'Class assignment removed successfully' };
  }

  async getStudentSubjects(studentId: string) {
    await this.findOne(studentId); // Validate student exists

    return this.prisma.studentSubject.findMany({
      where: { studentId },
      include: {
        subject: {
          include: {
            class: true,
            teachers: {
              include: {
                teacher: {
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
            },
          },
        },
      },
    });
  }
}
