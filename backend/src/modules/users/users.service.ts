import {
  Injectable,
  NotFoundException,
  ConflictException,
  Logger,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateUserDto, UpdateUserDto } from './dto';
import * as bcrypt from 'bcrypt';
import { PaginationResponse } from '../../common/interfaces/pagination-response.interface';

@Injectable()
export class UsersService {
  private readonly logger = new Logger(UsersService.name);
  
  constructor(private prisma: PrismaService) {}

  async create(dto: CreateUserDto) {
    // Check if user exists before starting transaction
    const existingUser = await this.prisma.user.findUnique({
      where: { email: dto.email },
    });

    if (existingUser) {
      this.logger.warn(`User creation failed: Email ${dto.email} already exists`);
      throw new ConflictException('User with this email already exists');
    }

    const hashedPassword = await bcrypt.hash(dto.password, 10);

    try {
      // Wrap in transaction to ensure atomicity
      // If Student/Teacher creation fails, User creation will be rolled back
      const user = await this.prisma.$transaction(async (tx) => {
        const createdUser = await tx.user.create({
          data: {
            ...dto,
            password: hashedPassword,
          },
        });

        this.logger.log(`User created successfully: ${createdUser.email} (ID: ${createdUser.id}, Role: ${createdUser.role})`);

        // Create Teacher or Student record based on role
        // These must succeed or the entire transaction rolls back
        if (dto.role === 'TEACHER') {
          await tx.teacher.create({
            data: {
              userId: createdUser.id,
              hireDate: new Date(),
            },
          });
          this.logger.log(`Teacher record created for user: ${createdUser.email}`);
        } else if (dto.role === 'STUDENT') {
          await tx.student.create({
            data: {
              userId: createdUser.id,
              enrollmentDate: new Date(),
            },
          });
          this.logger.log(`Student record created for user: ${createdUser.email}`);
        }

        return createdUser;
      });

      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      const { password, ...userWithoutPassword } = user;
      return userWithoutPassword;
    } catch (error) {
      this.logger.error(
        `Failed to create user ${dto.email}: ${error.message}`,
        error.stack,
      );
      throw error;
    }
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
      this.logger.warn(`User update failed: User ${id} not found`);
      throw new NotFoundException('User not found');
    }

    if (dto.email && dto.email !== existingUser.email) {
      const emailExists = await this.prisma.user.findUnique({
        where: { email: dto.email },
      });

      if (emailExists) {
        this.logger.warn(`User update failed: Email ${dto.email} already in use`);
        throw new ConflictException('Email already in use');
      }
    }

    const updateData: any = { ...dto };

    if (dto.password) {
      updateData.password = await bcrypt.hash(dto.password, 10);
    }

    try {
      // Wrap in transaction to ensure role changes are atomic
      const user = await this.prisma.$transaction(async (tx) => {
        const updatedUser = await tx.user.update({
          where: { id },
          data: updateData,
        });

        this.logger.log(`User updated successfully: ${updatedUser.email} (ID: ${updatedUser.id})`);

        // Handle role changes - create Teacher/Student records if needed
        if (dto.role === 'TEACHER' && !existingUser.teacher) {
          await tx.teacher.create({
            data: {
              userId: updatedUser.id,
              hireDate: new Date(),
            },
          });
          this.logger.log(`Teacher record created for user: ${updatedUser.email}`);
        } else if (dto.role === 'STUDENT' && !existingUser.student) {
          await tx.student.create({
            data: {
              userId: updatedUser.id,
              enrollmentDate: new Date(),
            },
          });
          this.logger.log(`Student record created for user: ${updatedUser.email}`);
        }

        return updatedUser;
      });

      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      const { password, ...userWithoutPassword } = user;
      return userWithoutPassword;
    } catch (error) {
      this.logger.error(
        `Failed to update user ${id}: ${error.message}`,
        error.stack,
      );
      throw error;
    }
  }

  async remove(id: string) {
    const user = await this.prisma.user.findUnique({
      where: { id },
    });

    if (!user) {
      this.logger.warn(`User deletion failed: User ${id} not found`);
      throw new NotFoundException('User not found');
    }

    try {
      await this.prisma.user.delete({
        where: { id },
      });

      this.logger.log(`User deleted successfully: ${user.email} (ID: ${id})`);
      return { message: 'User deleted successfully' };
    } catch (error) {
      this.logger.error(
        `Failed to delete user ${id}: ${error.message}`,
        error.stack,
      );
      throw error;
    }
  }

  async getProfile(userId: string) {
    return this.findOne(userId);
  }
}
