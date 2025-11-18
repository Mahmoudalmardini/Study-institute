import {
  Injectable,
  NotFoundException,
  ConflictException,
  Inject,
  forwardRef,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateStudentDto } from './dto/create-student.dto';
import { UpdateStudentDto } from './dto/update-student.dto';
import { InstallmentsService } from '../installments/installments.service';
import { Prisma } from '@prisma/client';

@Injectable()
export class StudentsService {
  constructor(
    private prisma: PrismaService,
    @Inject(forwardRef(() => InstallmentsService))
    private installmentsService: InstallmentsService,
  ) {}

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
      const subjectsForEnrollment = subjectIds.map(subjectId => ({
        subjectId,
      }));
      await this.enrollSubjects(student.id, subjectsForEnrollment, user.id);
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

  async update(id: string, dto: UpdateStudentDto, updatedBy?: string) {
    const student = await this.prisma.student.findUnique({
      where: { id },
    });

    if (!student) {
      throw new NotFoundException('Student not found');
    }

    if (dto.classId !== undefined) {
      if (dto.classId) {
        const classExists = await this.prisma.class.findUnique({
          where: { id: dto.classId },
        });

        if (!classExists) {
          throw new NotFoundException('Class not found');
        }
      }

      // Also update/create StudentClass junction table record
      if (dto.classId) {
        // Remove old class assignments
        await this.prisma.studentClass.deleteMany({
          where: { studentId: id },
        });

        // Create new class assignment
        const existing = await this.prisma.studentClass.findUnique({
          where: {
            studentId_classId: {
              studentId: id,
              classId: dto.classId,
            },
          },
        });

        if (!existing) {
          await this.prisma.studentClass.create({
            data: {
              studentId: id,
              classId: dto.classId,
              assignedBy: updatedBy || student.id, // Fallback to student id if no user provided
            },
          });
        }
      } else {
        // If classId is null, remove all class assignments
        await this.prisma.studentClass.deleteMany({
          where: { studentId: id },
        });
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
    subjects: Array<{ subjectId: string; teacherId?: string }>,
    enrolledBy: string,
  ) {
    const student = await this.findOne(studentId); // Validate student exists

    // Validate minimum 1 subject
    if (!subjects || subjects.length === 0) {
      throw new ConflictException('At least one subject must be assigned');
    }

    const subjectIds = subjects.map(s => s.subjectId);

    // Validate all subjects exist
    const subjectRecords = await this.prisma.subject.findMany({
      where: { id: { in: subjectIds } },
      include: { class: true },
    });

    if (subjectRecords.length !== subjectIds.length) {
      throw new NotFoundException('One or more subjects not found');
    }

    // Validate teachers if provided
    const teacherIds = subjects
      .filter(s => s.teacherId && s.teacherId.trim())
      .map(s => s.teacherId!.trim());
    
    // Remove duplicates for validation
    const uniqueTeacherIds = [...new Set(teacherIds)];
    
    if (uniqueTeacherIds.length > 0) {
      const teachers = await this.prisma.teacher.findMany({
        where: { id: { in: uniqueTeacherIds } },
      });

      if (teachers.length !== uniqueTeacherIds.length) {
        const foundIds = new Set(teachers.map(t => t.id));
        const missingIds = uniqueTeacherIds.filter(id => !foundIds.has(id));
        throw new NotFoundException(
          `One or more teachers not found. Missing teacher IDs: ${missingIds.join(', ')}`
        );
      }

      // Validate that teachers are assigned to the corresponding subjects
      for (const subj of subjects) {
        if (subj.teacherId) {
          const teacherSubject = await this.prisma.teacherSubject.findFirst({
            where: {
              teacherId: subj.teacherId,
              subjectId: subj.subjectId,
            },
          });

          if (!teacherSubject) {
            const subject = subjectRecords.find(s => s.id === subj.subjectId);
            throw new ConflictException(
              `Teacher is not assigned to teach subject: ${subject?.name || subj.subjectId}`,
            );
          }
        }
      }
    }

    // Get student's assigned classes from both StudentClass junction table and classId field
    const studentClasses = await this.prisma.studentClass.findMany({
      where: { studentId },
      select: { classId: true },
    });

    const studentClassIds = studentClasses.map((sc) => sc.classId);
    
    // Also check if student has a classId directly assigned (for backward compatibility)
    if (student.classId && !studentClassIds.includes(student.classId)) {
      studentClassIds.push(student.classId);
    }

    // Validate that student has a class assigned before enrolling subjects
    if (studentClassIds.length === 0) {
      throw new ConflictException(
        'Student must be assigned to a class before enrolling in subjects. Please assign a class to the student first.',
      );
    }

    // Validate subjects belong to student's assigned classes
    // Get subjects assigned to classes via ClassSubject junction table
    const classSubjects = await this.prisma.classSubject.findMany({
      where: { classId: { in: studentClassIds } },
      select: { subjectId: true },
    });
    const validSubjectIds = classSubjects.map(cs => cs.subjectId);

    const invalidSubjects = subjectRecords.filter(
      (subject) => !validSubjectIds.includes(subject.id),
    );

    if (invalidSubjects.length > 0) {
      const classNames = await this.prisma.class.findMany({
        where: { id: { in: studentClassIds } },
        select: { name: true },
      });
      throw new ConflictException(
        `The following subjects are not assigned to the student's class(es) (${classNames.map(c => c.name).join(', ')}): ${invalidSubjects.map((s) => s.name).join(', ')}. Please ensure these subjects are assigned to the student's class on the Classes page.`,
      );
    }

    // Remove existing enrollments not in the new list
    await this.prisma.studentSubject.deleteMany({
      where: {
        studentId,
        subjectId: { notIn: subjectIds },
      },
    });

    // Create or update enrollments
    const enrollments = await Promise.all(
      subjects.map(async ({ subjectId, teacherId }) => {
        const existing = await this.prisma.studentSubject.findUnique({
          where: {
            studentId_subjectId: {
              studentId,
              subjectId,
            },
          },
        });

        if (existing) {
          // Update existing enrollment with teacher if provided
          return this.prisma.studentSubject.update({
            where: {
              studentId_subjectId: {
                studentId,
                subjectId,
              },
            },
            data: {
              teacherId: teacherId || null,
            },
            include: {
              subject: true,
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
          });
        }

        return this.prisma.studentSubject.create({
          data: {
            studentId,
            subjectId,
            teacherId: teacherId || null,
            enrolledBy,
          },
          include: {
            subject: true,
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
        });
      }),
    );

    // Automatically create installments for enrolled subjects
    // Calculate for the enrollment month and current month if different
    // The calculation method will check ClassSubject relationships for installment amounts
    try {
      const now = new Date();
      const currentMonth = now.getMonth() + 1;
      const currentYear = now.getFullYear();

      // Calculate for current month (will handle cases with no installments gracefully)
      await this.installmentsService.calculateMonthlyInstallment(
        studentId,
        currentMonth,
        currentYear,
      );

      // Also calculate for enrollment month if different from current month
      // Use the earliest enrollment date from the newly enrolled subjects
      const enrollmentDates = enrollments
        .map((e) => e.enrolledAt || e.createdAt)
        .filter((d) => d)
        .map((d) => new Date(d));

      if (enrollmentDates.length > 0) {
        const earliestEnrollment = new Date(Math.min(...enrollmentDates.map((d) => d.getTime())));
        const enrollmentMonth = earliestEnrollment.getMonth() + 1;
        const enrollmentYear = earliestEnrollment.getFullYear();

        // Only calculate for enrollment month if it's different from current month
        if (enrollmentMonth !== currentMonth || enrollmentYear !== currentYear) {
          await this.installmentsService.calculateMonthlyInstallment(
            studentId,
            enrollmentMonth,
            enrollmentYear,
          );
        }
      }
    } catch (error) {
      // Log error but don't fail enrollment if installment calculation fails
      console.error('Error creating installments after enrollment:', error);
      // Re-throw only if it's a critical error (not a validation error)
      if (error instanceof Error && !error.message.includes('not found')) {
        console.warn('Installment calculation failed, but enrollment succeeded:', error.message);
      }
    }

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
    // Validate student exists and get classId
    const student = await this.prisma.student.findUnique({
      where: { id: studentId },
      select: { id: true, classId: true },
    });

    if (!student) {
      throw new NotFoundException('Student not found');
    }

    // Fetch student subjects with essential data only
    const studentSubjects = await this.prisma.studentSubject.findMany({
      where: { studentId },
      include: {
        subject: {
          select: {
            id: true,
            name: true,
            code: true,
            description: true,
            classId: true,
            class: {
              select: {
                id: true,
                name: true,
                grade: true,
              },
            },
          },
        },
        teacher: {
          select: {
            id: true,
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
      orderBy: {
        createdAt: 'desc',
      },
    });

    // Fetch class subjects separately to get all classes for each subject and installment amounts
    const subjectIds = studentSubjects.map(ss => ss.subjectId);
    const classSubjects = await this.prisma.classSubject.findMany({
      where: {
        subjectId: { in: subjectIds },
      },
      include: {
        class: {
          select: {
            id: true,
            name: true,
            grade: true,
          },
        },
      },
    });

    // Fetch teachers for subjects separately
    const teacherSubjects = await this.prisma.teacherSubject.findMany({
      where: {
        subjectId: { in: subjectIds },
      },
      include: {
        teacher: {
          select: {
            id: true,
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
    });

    // Combine the data and convert Prisma Decimal to number for JSON serialization
    return studentSubjects.map(ss => {
      let monthlyInstallment: number | null = null;
      
      // Get installment from ClassSubject for the student's class
      if (student?.classId) {
        const classSubject = classSubjects.find(
          cs => cs.subjectId === ss.subjectId && cs.classId === student.classId
        );
        
        if (classSubject?.monthlyInstallment) {
          const monthlyInstallmentValue = classSubject.monthlyInstallment;
          // Convert Prisma Decimal to number
          if (monthlyInstallmentValue instanceof Prisma.Decimal) {
            monthlyInstallment = monthlyInstallmentValue.toNumber();
          } else if (typeof monthlyInstallmentValue === 'number') {
            monthlyInstallment = monthlyInstallmentValue;
          } else if (typeof monthlyInstallmentValue === 'string') {
            monthlyInstallment = parseFloat(monthlyInstallmentValue);
          } else if (typeof monthlyInstallmentValue === 'object' && monthlyInstallmentValue !== null && 'toString' in monthlyInstallmentValue) {
            monthlyInstallment = parseFloat(String(monthlyInstallmentValue));
          } else {
            monthlyInstallment = parseFloat(String(monthlyInstallmentValue));
          }
          
          // Handle NaN
          if (isNaN(monthlyInstallment)) {
            monthlyInstallment = null;
          }
        }
      }
      
      return {
        ...ss,
        subject: {
          ...ss.subject,
          monthlyInstallment,
          classSubjects: classSubjects
            .filter(cs => cs.subjectId === ss.subjectId)
            .map(cs => ({ class: cs.class })),
          teachers: teacherSubjects
            .filter(ts => ts.subjectId === ss.subjectId)
            .map(ts => ({ teacher: ts.teacher })),
        },
      };
    });
  }
}
