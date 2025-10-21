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

    return this.prisma.class.create({
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
        subjects: true,
        _count: {
          select: {
            students: true,
            subjects: true,
          },
        },
      },
    });
  }

  async findAll() {
    return this.prisma.class.findMany({
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
            subjects: true,
          },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
    });
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
        subjects: true,
      },
    });

    if (!classData) {
      throw new NotFoundException(`Class with ID ${id} not found`);
    }

    return classData;
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

    return this.prisma.class.update({
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
        subjects: true,
      },
    });
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
}

