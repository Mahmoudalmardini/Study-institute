import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ConflictException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateSubjectDto } from './dto/create-subject.dto';
import { UpdateSubjectDto } from './dto/update-subject.dto';

@Injectable()
export class SubjectsService {
  constructor(private readonly prisma: PrismaService) {}

  async create(createSubjectDto: CreateSubjectDto) {
    // Validate class exists if provided
    if (createSubjectDto.classId) {
      const classData = await this.prisma.class.findUnique({
        where: { id: createSubjectDto.classId },
      });
      if (!classData) {
        throw new NotFoundException(
          `Class with ID ${createSubjectDto.classId} not found`,
        );
      }
    }

    // Check if subject code already exists if provided
    if (createSubjectDto.code) {
      const existingSubject = await this.prisma.subject.findFirst({
        where: { code: createSubjectDto.code },
      });
      if (existingSubject) {
        throw new ConflictException(
          `Subject with code ${createSubjectDto.code} already exists`,
        );
      }
    }

    return this.prisma.subject.create({
      data: createSubjectDto,
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
        _count: {
          select: {
            students: true,
            teachers: true,
          },
        },
      },
    });
  }

  async findAll(classId?: string) {
    return this.prisma.subject.findMany({
      where: classId ? { classId } : undefined,
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
        _count: {
          select: {
            students: true,
            teachers: true,
          },
        },
      },
      orderBy: {
        name: 'asc',
      },
    });
  }

  async findOne(id: string) {
    const subject = await this.prisma.subject.findUnique({
      where: { id },
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
        students: {
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
        },
      },
    });

    if (!subject) {
      throw new NotFoundException(`Subject with ID ${id} not found`);
    }

    return subject;
  }

  async update(id: string, updateSubjectDto: UpdateSubjectDto) {
    await this.findOne(id); // Check if subject exists

    // Validate class exists if provided
    if (updateSubjectDto.classId) {
      const classData = await this.prisma.class.findUnique({
        where: { id: updateSubjectDto.classId },
      });
      if (!classData) {
        throw new NotFoundException(
          `Class with ID ${updateSubjectDto.classId} not found`,
        );
      }
    }

    // Check if subject code already exists (if updating code)
    if (updateSubjectDto.code) {
      const existingSubject = await this.prisma.subject.findFirst({
        where: {
          code: updateSubjectDto.code,
          NOT: { id },
        },
      });
      if (existingSubject) {
        throw new ConflictException(
          `Subject with code ${updateSubjectDto.code} already exists`,
        );
      }
    }

    return this.prisma.subject.update({
      where: { id },
      data: updateSubjectDto,
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
        _count: {
          select: {
            students: true,
            teachers: true,
          },
        },
      },
    });
  }

  async remove(id: string) {
    await this.findOne(id); // Check if subject exists

    // Check if subject has enrolled students
    const subject = await this.prisma.subject.findUnique({
      where: { id },
      include: {
        _count: {
          select: {
            students: true,
          },
        },
      },
    });

    if (subject && subject._count.students > 0) {
      throw new BadRequestException(
        'Cannot delete subject with enrolled students',
      );
    }

    return this.prisma.subject.delete({
      where: { id },
    });
  }

  async assignTeacher(subjectId: string, teacherId: string, classId: string, assignedBy: string) {
    // Validate subject exists
    const subject = await this.findOne(subjectId);

    // Validate teacher exists
    const teacher = await this.prisma.teacher.findUnique({
      where: { id: teacherId },
    });
    if (!teacher) {
      throw new NotFoundException(`Teacher with ID ${teacherId} not found`);
    }

    // Validate class exists
    const classData = await this.prisma.class.findUnique({
      where: { id: classId },
    });
    if (!classData) {
      throw new NotFoundException(`Class with ID ${classId} not found`);
    }

    // Check if teacher is already assigned to this subject
    const existing = await this.prisma.teacherSubject.findFirst({
      where: {
        teacherId,
        subjectId,
      },
      include: {
        subject: true,
      },
    });

    // If teacher is already assigned to this subject, prevent duplicate assignment
    if (existing) {
      throw new ConflictException('Teacher is already assigned to this subject. Please unassign the teacher first if you want to change the class assignment.');
    }

    // Update subject to be assigned to the class if not already assigned
    if (!subject.classId || subject.classId !== classId) {
      await this.prisma.subject.update({
        where: { id: subjectId },
        data: { classId },
      });
    }

    return this.prisma.teacherSubject.create({
      data: {
        teacherId,
        subjectId,
        assignedBy,
      },
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
        subject: {
          include: {
            class: true,
          },
        },
      },
    });
  }

  async unassignTeacher(subjectId: string, teacherId: string) {
    // Validate subject exists
    await this.findOne(subjectId);

    // Check if assignment exists
    const assignment = await this.prisma.teacherSubject.findFirst({
      where: {
        teacherId,
        subjectId,
      },
    });

    if (!assignment) {
      throw new NotFoundException('Teacher assignment not found');
    }

    return this.prisma.teacherSubject.delete({
      where: {
        id: assignment.id,
      },
    });
  }

  async getTeachersBySubject(subjectId: string) {
    await this.findOne(subjectId);

    return this.prisma.teacherSubject.findMany({
      where: { subjectId },
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
    });
  }
}

