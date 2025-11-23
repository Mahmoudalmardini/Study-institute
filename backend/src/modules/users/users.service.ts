import {
  Injectable,
  NotFoundException,
  ConflictException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateUserDto, UpdateUserDto } from './dto';
import * as bcrypt from 'bcrypt';
import { PaginationResponse } from '../../common/interfaces/pagination-response.interface';

@Injectable()
export class UsersService {
  constructor(private prisma: PrismaService) {}

  async create(dto: CreateUserDto) {
    const existingUser = await this.prisma.user.findUnique({
      where: { email: dto.email },
    });

    if (existingUser) {
      throw new ConflictException('User with this email already exists');
    }

    const hashedPassword = await bcrypt.hash(dto.password, 10);

    const user = await this.prisma.user.create({
      data: {
        ...dto,
        password: hashedPassword,
      },
    });

    // Create Teacher or Student record based on role
    if (dto.role === 'TEACHER') {
      await this.prisma.teacher.create({
        data: {
          userId: user.id,
          hireDate: new Date(),
        },
      });
    } else if (dto.role === 'STUDENT') {
      await this.prisma.student.create({
        data: {
          userId: user.id,
          enrollmentDate: new Date(),
        },
      });
    }

    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { password, ...userWithoutPassword } = user;
    return userWithoutPassword;
  }

  async findAll(
    role?: string,
    page: number = 1,
    limit: number = 20,
  ): Promise<PaginationResponse<any>> {
    const where = role ? { role: role as any } : {};
    const skip = (page - 1) * limit;

    const [data, total] = await Promise.all([
      this.prisma.user.findMany({
        where,
        skip,
        take: limit,
        select: {
          id: true,
          email: true,
          firstName: true,
          lastName: true,
          role: true,
          phone: true,
          isActive: true,
          createdAt: true,
          updatedAt: true,
          teacher: {
            select: {
              id: true,
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
            },
          },
          student: {
            select: {
              id: true,
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
        },
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.user.count({ where }),
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
    const user = await this.prisma.user.findUnique({
      where: { id },
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        role: true,
        phone: true,
        isActive: true,
        createdAt: true,
        updatedAt: true,
        student: true,
        teacher: true,
      },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    return user;
  }

  async update(id: string, dto: UpdateUserDto) {
    const existingUser = await this.prisma.user.findUnique({
      where: { id },
      include: {
        teacher: true,
        student: true,
      },
    });

    if (!existingUser) {
      throw new NotFoundException('User not found');
    }

    if (dto.email && dto.email !== existingUser.email) {
      const emailExists = await this.prisma.user.findUnique({
        where: { email: dto.email },
      });

      if (emailExists) {
        throw new ConflictException('Email already in use');
      }
    }

    const updateData: any = { ...dto };

    if (dto.password) {
      updateData.password = await bcrypt.hash(dto.password, 10);
    }

    const user = await this.prisma.user.update({
      where: { id },
      data: updateData,
    });

    // Handle role changes - create Teacher/Student records if needed
    if (dto.role === 'TEACHER' && !existingUser.teacher) {
      await this.prisma.teacher.create({
        data: {
          userId: user.id,
          hireDate: new Date(),
        },
      });
    } else if (dto.role === 'STUDENT' && !existingUser.student) {
      await this.prisma.student.create({
        data: {
          userId: user.id,
          enrollmentDate: new Date(),
        },
      });
    }

    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { password, ...userWithoutPassword } = user;
    return userWithoutPassword;
  }

  async remove(id: string) {
    const user = await this.prisma.user.findUnique({
      where: { id },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    await this.prisma.user.delete({
      where: { id },
    });

    return { message: 'User deleted successfully' };
  }

  async getProfile(userId: string) {
    return this.findOne(userId);
  }
}
