import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateClassDto } from './dto/create-class.dto';
import { UpdateClassDto } from './dto/update-class.dto';

@Injectable()
export class ClassesService {
  constructor(private readonly prisma: PrismaService) {}

  async create(createClassDto: CreateClassDto) {
    // Validate teacher exists if provided
    if (createClassDto.teacherId) {
      const teacher = await this.prisma.teacher.findUnique({
        where: { id: createClassDto.teacherId },
      });
      if (!teacher) {
        throw new NotFoundException(
          `Teacher with ID ${createClassDto.teacherId} not found`,
        );
      }
    }

    const newClass = await this.prisma.class.create({
      data: createClassDto,
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
        students: {
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
        classSubjects: {
          include: {
            subject: true,
          },
        },
        _count: {
          select: {
            students: true,
            classSubjects: true,
          },
        },
      },
    });

    return {
      ...newClass,
      subjects: newClass.classSubjects.map((cs) => cs.subject),
      _count: {
        ...newClass._count,
        subjects: newClass._count.classSubjects,
      },
    };
  }

  async findAll() {
    const classes = await this.prisma.class.findMany({
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
        _count: {
          select: {
            students: true,
            classSubjects: true,
          },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
    });

    // Map to use classSubjects count as subjects count for backward compatibility
    return classes.map((cls) => ({
      ...cls,
      _count: {
        ...cls._count,
        subjects: cls._count.classSubjects,
      },
    }));
  }

  async findOne(id: string) {
    const classData = await this.prisma.class.findUnique({
      where: { id },
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
        students: {
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
        classSubjects: {
          include: {
            subject: true,
          },
        },
      },
    });

    if (!classData) {
      throw new NotFoundException(`Class with ID ${id} not found`);
    }

    return {
      ...classData,
      subjects: classData.classSubjects.map((cs) => cs.subject),
    };
  }

  async update(id: string, updateClassDto: UpdateClassDto) {
    await this.findOne(id); // Check if class exists

    // Validate teacher exists if provided
    if (updateClassDto.teacherId) {
      const teacher = await this.prisma.teacher.findUnique({
        where: { id: updateClassDto.teacherId },
      });
      if (!teacher) {
        throw new NotFoundException(
          `Teacher with ID ${updateClassDto.teacherId} not found`,
        );
      }
    }

    const updatedClass = await this.prisma.class.update({
      where: { id },
      data: updateClassDto,
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
        students: {
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
        classSubjects: {
          include: {
            subject: true,
          },
        },
      },
    });

    return {
      ...updatedClass,
      subjects: updatedClass.classSubjects.map((cs) => cs.subject),
    };
  }

  async remove(id: string) {
    await this.findOne(id); // Check if class exists

    // Check if class has students
    const classData = await this.prisma.class.findUnique({
      where: { id },
      include: {
        _count: {
          select: {
            students: true,
          },
        },
      },
    });

    if (classData && classData._count.students > 0) {
      throw new BadRequestException(
        'Cannot delete class with enrolled students',
      );
    }

    return this.prisma.class.delete({
      where: { id },
    });
  }

  async assignSubjects(
    classId: string,
    subjects: Array<{ subjectId: string; monthlyInstallment?: number }>,
    assignedBy: string,
  ) {
    // Validate class exists
    await this.findOne(classId);

    // Extract subject IDs
    const subjectIds = subjects.map((s) => s.subjectId);

    // Validate all subjects exist
    const existingSubjects = await this.prisma.subject.findMany({
      where: { id: { in: subjectIds } },
    });

    if (existingSubjects.length !== subjectIds.length) {
      throw new NotFoundException('One or more subjects not found');
    }

    // Create or update class-subject relationships using junction table
    const assignments = await Promise.all(
      subjects.map(async ({ subjectId, monthlyInstallment }) => {
        // Check if assignment already exists
        const existing = await this.prisma.classSubject.findUnique({
          where: {
            classId_subjectId: {
              classId,
              subjectId,
            },
          },
        });

        if (existing) {
          // Update existing assignment with new installment if provided
          if (monthlyInstallment !== undefined) {
            return this.prisma.classSubject.update({
              where: {
                classId_subjectId: {
                  classId,
                  subjectId,
                },
              },
              data: {
                monthlyInstallment: monthlyInstallment !== null ? monthlyInstallment : null,
              },
              include: {
                subject: true,
                class: true,
              },
            });
          }
          return existing;
        }

        // Create new assignment
        return this.prisma.classSubject.create({
          data: {
            classId,
            subjectId,
            assignedBy,
            monthlyInstallment: monthlyInstallment !== undefined ? monthlyInstallment : null,
          },
          include: {
            subject: true,
            class: true,
          },
        });
      }),
    );

    // Return subjects with class information
    return this.prisma.subject.findMany({
      where: { id: { in: subjectIds } },
      include: {
        classSubjects: {
          where: { classId },
          include: {
            class: true,
          },
        },
      },
    });
  }

  async unassignSubject(classId: string, subjectId: string) {
    // Validate class exists
    await this.findOne(classId);

    // Validate subject exists
    const subject = await this.prisma.subject.findUnique({
      where: { id: subjectId },
    });

    if (!subject) {
      throw new NotFoundException(`Subject with ID ${subjectId} not found`);
    }

    // Check if assignment exists in junction table
    const assignment = await this.prisma.classSubject.findUnique({
      where: {
        classId_subjectId: {
          classId,
          subjectId,
        },
      },
    });

    if (!assignment) {
      throw new BadRequestException('Subject is not assigned to this class');
    }

    // Remove class-subject relationship from junction table
    await this.prisma.classSubject.delete({
      where: {
        classId_subjectId: {
          classId,
          subjectId,
        },
      },
    });

    return subject;
  }

  async getClassSubjects(classId: string) {
    // Validate class exists
    await this.findOne(classId);

    // Return all subjects assigned to this class via junction table
    const classSubjects = await this.prisma.classSubject.findMany({
      where: { classId },
      include: {
        subject: true,
        class: true,
      },
      orderBy: {
        subject: {
          name: 'asc',
        },
      },
    });

    // Map to return subjects with class information
    return classSubjects.map((cs) => ({
      ...cs.subject,
      class: cs.class,
      monthlyInstallment: cs.monthlyInstallment,
    }));
  }

  async updateClassSubjectInstallment(
    classId: string,
    subjectId: string,
    monthlyInstallment: number | null,
  ) {
    // Validate class exists
    await this.findOne(classId);

    // Validate subject exists
    const subject = await this.prisma.subject.findUnique({
      where: { id: subjectId },
    });

    if (!subject) {
      throw new NotFoundException(`Subject with ID ${subjectId} not found`);
    }

    // Check if assignment exists
    const assignment = await this.prisma.classSubject.findUnique({
      where: {
        classId_subjectId: {
          classId,
          subjectId,
        },
      },
    });

    if (!assignment) {
      throw new NotFoundException(
        'Subject is not assigned to this class. Please assign it first.',
      );
    }

    // Update the installment
    const updated = await this.prisma.classSubject.update({
      where: {
        classId_subjectId: {
          classId,
          subjectId,
        },
      },
      data: {
        monthlyInstallment: monthlyInstallment !== undefined ? monthlyInstallment : null,
      },
      include: {
        subject: true,
        class: true,
      },
    });

    return updated;
  }
}

