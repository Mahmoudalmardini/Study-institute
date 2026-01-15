import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ForbiddenException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import {
  CreateSalaryDto,
  UpdateSalaryDto,
  SubmitHourRequestDto,
  ReviewHourRequestDto,
} from './dto';
import { HourRequestStatus } from '@prisma/client';
import { Decimal } from '@prisma/client/runtime/library';

@Injectable()
export class PayrollService {
  constructor(private prisma: PrismaService) {}

  // Get current salary for teacher by teacherId (internal)
  async getCurrentSalary(teacherId: string) {
    const teacher = await this.prisma.teacher.findUnique({
      where: { id: teacherId },
      include: { user: true },
    });

    if (!teacher) {
      throw new NotFoundException('Teacher not found');
    }

    // Get the most recent salary (regardless of effective date) for display
    // This shows all salaries including ones that will be effective in the future
    const salary = await this.prisma.teacherSalary.findFirst({
      where: {
        teacherId,
      },
      orderBy: {
        effectiveFrom: 'desc',
      },
    });

    return {
      teacher: {
        id: teacher.id,
        userId: teacher.userId,
        user: teacher.user,
      },
      salary: salary
        ? {
            id: salary.id,
            monthlySalary: salary.monthlySalary,
            hourlyWage: salary.hourlyWage,
            effectiveFrom: salary.effectiveFrom,
          }
        : null,
    };
  }

  // Get all teachers with their current salaries (Admin/Supervisor)
  async getAllSalaries(search?: string) {
    try {
      const teachers = await this.prisma.teacher.findMany({
        where: search
          ? {
              user: {
                OR: [
                  { firstName: { contains: search, mode: 'insensitive' } },
                  { lastName: { contains: search, mode: 'insensitive' } },
                  { email: { contains: search, mode: 'insensitive' } },
                ],
              },
            }
          : undefined,
        include: {
          user: {
            select: {
              id: true,
              email: true,
              firstName: true,
              lastName: true,
            },
          },
        },
      });

      const teachersWithSalaries = await Promise.all(
        teachers.map(async (teacher) => {
          try {
            // Get the most recent salary (regardless of effective date) for display
            // This shows all salaries including ones that will be effective in the future
            const salary = await this.prisma.teacherSalary.findFirst({
              where: {
                teacherId: teacher.id,
              },
              orderBy: {
                effectiveFrom: 'desc',
              },
            });

            return {
              ...teacher,
              currentSalary: salary
                ? {
                    id: salary.id,
                    monthlySalary: salary.monthlySalary,
                    hourlyWage: salary.hourlyWage,
                    effectiveFrom: salary.effectiveFrom,
                  }
                : null,
            };
          } catch (error) {
            console.error(`Error fetching salary for teacher ${teacher.id}:`, error);
            return {
              ...teacher,
              currentSalary: null,
            };
          }
        }),
      );

      return teachersWithSalaries;
    } catch (error) {
      console.error('Error in getAllSalaries:', error);
      throw error;
    }
  }

  // Create salary for a teacher (Admin)
  async createSalary(adminId: string, dto: CreateSalaryDto) {
    if (!dto.monthlySalary && !dto.hourlyWage) {
      throw new BadRequestException(
        'Either monthly salary or hourly wage must be provided',
      );
    }

    const teacher = await this.prisma.teacher.findUnique({
      where: { id: dto.teacherId! },
      include: { user: true },
    });

    if (!teacher) {
      throw new NotFoundException('Teacher not found');
    }

    // Calculate effective from date (current month - starts immediately)
    const now = new Date();
    const currentMonth = new Date(now.getFullYear(), now.getMonth(), 1);

    const salary = await this.prisma.teacherSalary.create({
      data: {
        teacherId: dto.teacherId!,
        monthlySalary: dto.monthlySalary
          ? new Decimal(dto.monthlySalary)
          : null,
        hourlyWage: dto.hourlyWage ? new Decimal(dto.hourlyWage) : null,
        effectiveFrom: currentMonth,
      },
      include: {
        teacher: {
          include: {
            user: {
              select: {
                id: true,
                email: true,
                firstName: true,
                lastName: true,
              },
            },
          },
        },
      },
    });

    return salary;
  }

  // Update salary for a teacher (Admin)
  async updateSalary(
    adminId: string,
    salaryId: string,
    dto: UpdateSalaryDto,
  ) {
    const salary = await this.prisma.teacherSalary.findUnique({
      where: { id: salaryId },
      include: { teacher: true },
    });

    if (!salary) {
      throw new NotFoundException('Salary record not found');
    }

    if (!dto.monthlySalary && !dto.hourlyWage) {
      throw new BadRequestException(
        'Either monthly salary or hourly wage must be provided',
      );
    }

    // Calculate effective from date (current month - starts immediately)
    const now = new Date();
    const currentMonth = new Date(now.getFullYear(), now.getMonth(), 1);

    // Create a new salary record with updated values effective from current month
    const updatedSalary = await this.prisma.teacherSalary.create({
      data: {
        teacherId: salary.teacherId,
        monthlySalary: dto.monthlySalary
          ? new Decimal(dto.monthlySalary)
          : salary.monthlySalary,
        hourlyWage: dto.hourlyWage
          ? new Decimal(dto.hourlyWage)
          : salary.hourlyWage,
        effectiveFrom: currentMonth,
      },
      include: {
        teacher: {
          include: {
            user: {
              select: {
                id: true,
                email: true,
                firstName: true,
                lastName: true,
              },
            },
          },
        },
      },
    });

    return updatedSalary;
  }

  // Delete salary (Admin)
  async deleteSalary(adminId: string, salaryId: string) {
    const salary = await this.prisma.teacherSalary.findUnique({
      where: { id: salaryId },
    });

    if (!salary) {
      throw new NotFoundException('Salary record not found');
    }

    await this.prisma.teacherSalary.delete({
      where: { id: salaryId },
    });

    return { message: 'Salary deleted successfully' };
  }

  // Submit hour request (Teacher)
  async submitHourRequest(teacherId: string, dto: SubmitHourRequestDto) {
    const teacher = await this.prisma.teacher.findUnique({
      where: { userId: teacherId },
    });

    if (!teacher) {
      throw new NotFoundException('Teacher profile not found');
    }

    // Check if teacher has hourly wage configured (get most recent salary)
    const currentSalary = await this.prisma.teacherSalary.findFirst({
      where: {
        teacherId: teacher.id,
        hourlyWage: {
          not: null,
        },
      },
      orderBy: {
        effectiveFrom: 'desc',
      },
    });

    if (!currentSalary || !currentSalary.hourlyWage) {
      throw new BadRequestException(
        'Hourly wage not configured for this teacher',
      );
    }

    // Set date to today (current date when request is submitted)
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    // Allow multiple hour requests per day - teachers can submit multiple times
    const hourRequest = await this.prisma.hourRequest.create({
      data: {
        teacherId: teacher.id,
        date: today, // Automatically set to today's date
        hours: new Decimal(dto.hours),
        minutes: dto.minutes,
        status: HourRequestStatus.PENDING,
      },
      include: {
        teacher: {
          include: {
            user: {
              select: {
                id: true,
                email: true,
                firstName: true,
                lastName: true,
              },
            },
          },
        },
      },
    });

    return hourRequest;
  }

  // Get hour requests for a teacher
  async getHourRequests(teacherId: string, status?: HourRequestStatus) {
    const teacher = await this.prisma.teacher.findUnique({
      where: { userId: teacherId },
    });

    if (!teacher) {
      throw new NotFoundException('Teacher profile not found');
    }

    const requests = await this.prisma.hourRequest.findMany({
      where: {
        teacherId: teacher.id,
        ...(status ? { status } : {}),
      },
      orderBy: {
        date: 'desc',
      },
      include: {
        teacher: {
          include: {
            user: {
              select: {
                id: true,
                email: true,
                firstName: true,
                lastName: true,
              },
            },
          },
        },
      },
    });

    return requests;
  }

  // Get all pending hour requests (Admin)
  async getPendingHourRequests() {
    try {
      const requests = await this.prisma.hourRequest.findMany({
        where: {
          status: HourRequestStatus.PENDING,
        },
        orderBy: {
          createdAt: 'desc',
        },
        include: {
          teacher: {
            include: {
              user: {
                select: {
                  id: true,
                  email: true,
                  firstName: true,
                  lastName: true,
                },
              },
            },
          },
        },
      });

      return requests;
    } catch (error) {
      console.error('Error in getPendingHourRequests:', error);
      throw error;
    }
  }

  // Review hour request (Admin)
  async reviewHourRequest(
    adminId: string,
    requestId: string,
    dto: ReviewHourRequestDto,
  ) {
    const request = await this.prisma.hourRequest.findUnique({
      where: { id: requestId },
      include: { teacher: true },
    });

    if (!request) {
      throw new NotFoundException('Hour request not found');
    }

    const updateData: any = {
      status: dto.status,
      reviewedBy: adminId,
      reviewedAt: new Date(),
    };

    if (dto.status === HourRequestStatus.MODIFIED) {
      if (dto.adminModifiedHours === undefined) {
        throw new BadRequestException(
          'Modified hours must be provided when status is MODIFIED',
        );
      }
      updateData.adminModifiedHours = new Decimal(dto.adminModifiedHours);
      updateData.adminModifiedMinutes = dto.adminModifiedMinutes || 0;
    }

    if (dto.adminFeedback) {
      updateData.adminFeedback = dto.adminFeedback;
    }

    const updatedRequest = await this.prisma.hourRequest.update({
      where: { id: requestId },
      data: updateData,
      include: {
        teacher: {
          include: {
            user: {
              select: {
                id: true,
                email: true,
                firstName: true,
                lastName: true,
              },
            },
          },
        },
      },
    });

    // If approved or modified, add to monthly hours
    if (
      dto.status === HourRequestStatus.APPROVED ||
      dto.status === HourRequestStatus.MODIFIED
    ) {
      await this.addApprovedHours(request.teacherId, request.date, updatedRequest);
    }

    return updatedRequest;
  }

  // Helper: Add approved hours to monthly total
  private async addApprovedHours(
    teacherId: string,
    date: Date,
    request: any,
  ) {
    const month = date.getMonth() + 1;
    const year = date.getFullYear();

    // Get total hours (from request or modified values)
    const hours =
      request.status === HourRequestStatus.MODIFIED &&
      request.adminModifiedHours
        ? request.adminModifiedHours
        : request.hours;
    const minutes =
      request.status === HourRequestStatus.MODIFIED &&
      request.adminModifiedMinutes !== null
        ? new Decimal(request.adminModifiedMinutes)
        : new Decimal(request.minutes);

    const totalHoursDecimal = hours.toNumber() + minutes.toNumber() / 60;

    // Get or create monthly payroll record
    let payrollRecord = await this.prisma.monthlyPayrollRecord.findUnique({
      where: {
        teacherId_month_year: {
          teacherId,
          month,
          year,
        },
      },
    });

    const currentSalary = await this.getCurrentEffectiveSalary(teacherId, month, year);

    if (!payrollRecord) {
      payrollRecord = await this.prisma.monthlyPayrollRecord.create({
        data: {
          teacherId,
          month,
          year,
          monthlySalary: currentSalary.monthlySalary || new Decimal(0),
          hourlyWage: currentSalary.hourlyWage || new Decimal(0),
          totalHours: new Decimal(totalHoursDecimal),
          totalEntitlement: this.calculateEntitlement(
            currentSalary.monthlySalary || new Decimal(0),
            new Decimal(totalHoursDecimal),
            currentSalary.hourlyWage || new Decimal(0),
          ),
        },
      });
    } else {
      // Update existing record - also update salary values if they've changed
      const newTotalHours = payrollRecord.totalHours.toNumber() + totalHoursDecimal;
      const updatedSalary = await this.getCurrentEffectiveSalary(teacherId, month, year);
      payrollRecord = await this.prisma.monthlyPayrollRecord.update({
        where: {
          teacherId_month_year: {
            teacherId,
            month,
            year,
          },
        },
        data: {
          monthlySalary: updatedSalary.monthlySalary || payrollRecord.monthlySalary,
          hourlyWage: updatedSalary.hourlyWage || payrollRecord.hourlyWage,
          totalHours: new Decimal(newTotalHours),
          totalEntitlement: this.calculateEntitlement(
            updatedSalary.monthlySalary || payrollRecord.monthlySalary,
            new Decimal(newTotalHours),
            updatedSalary.hourlyWage || payrollRecord.hourlyWage,
          ),
        },
      });
    }

    return payrollRecord;
  }

  // Helper: Get current effective salary for a specific month/year
  private async getCurrentEffectiveSalary(
    teacherId: string,
    month: number,
    year: number,
  ) {
    const effectiveFrom = new Date(year, month - 1, 1);

    const salary = await this.prisma.teacherSalary.findFirst({
      where: {
        teacherId,
        effectiveFrom: {
          lte: effectiveFrom,
        },
      },
      orderBy: {
        effectiveFrom: 'desc',
      },
    });

    return {
      monthlySalary: salary?.monthlySalary || null,
      hourlyWage: salary?.hourlyWage || null,
    };
  }

  // Helper: Calculate monthly entitlement
  private calculateEntitlement(
    monthlySalary: Decimal,
    totalHours: Decimal,
    hourlyWage: Decimal,
  ): Decimal {
    const monthly = monthlySalary.toNumber();
    const hours = totalHours.toNumber();
    const hourly = hourlyWage.toNumber();

    return new Decimal(monthly + hours * hourly);
  }

  // Get monthly payroll records for a teacher (by userId)
  async getMonthlyRecords(userId: string) {
    const teacher = await this.prisma.teacher.findUnique({
      where: { userId },
    });

    if (!teacher) {
      throw new NotFoundException('Teacher profile not found');
    }

    const records = await this.prisma.monthlyPayrollRecord.findMany({
      where: {
        teacherId: teacher.id,
      },
      orderBy: [
        { year: 'desc' },
        { month: 'desc' },
      ],
    });

    return records;
  }

  // Get monthly payroll record for specific month/year (Admin/Teacher)
  // teacherId can be either userId (for /me endpoints) or teacher.id (for admin endpoints)
  async getMonthlyRecord(teacherIdOrUserId: string, month: number, year: number, isUserId: boolean = true) {
    let teacher;
    
    if (isUserId) {
      teacher = await this.prisma.teacher.findUnique({
        where: { userId: teacherIdOrUserId },
        include: { user: true },
      });
    } else {
      teacher = await this.prisma.teacher.findUnique({
        where: { id: teacherIdOrUserId },
        include: { user: true },
      });
    }

    if (!teacher) {
      throw new NotFoundException('Teacher profile not found');
    }

    let record = await this.prisma.monthlyPayrollRecord.findUnique({
      where: {
        teacherId_month_year: {
          teacherId: teacher.id,
          month,
          year,
        },
      },
    });

    // If record doesn't exist, create it with current salary and 0 hours
    if (!record) {
      const currentSalary = await this.getCurrentEffectiveSalary(
        teacher.id,
        month,
        year,
      );

      const monthlySalary = currentSalary.monthlySalary || new Decimal(0);
      const hourlyWage = currentSalary.hourlyWage || new Decimal(0);

      record = await this.prisma.monthlyPayrollRecord.create({
        data: {
          teacherId: teacher.id,
          month,
          year,
          monthlySalary,
          hourlyWage,
          totalHours: new Decimal(0),
          totalEntitlement: monthlySalary,
        },
      });
    }

    return {
      ...record,
      teacher: {
        id: teacher.id,
        user: teacher.user,
      },
    };
  }

  // Get all monthly records (Admin/Supervisor)
  async getAllMonthlyRecords(month?: number, year?: number) {
    const where: any = {};
    if (month && year) {
      where.month = month;
      where.year = year;
    }

    const records = await this.prisma.monthlyPayrollRecord.findMany({
      where,
      include: {
        teacher: {
          include: {
            user: {
              select: {
                id: true,
                email: true,
                firstName: true,
                lastName: true,
              },
            },
          },
        },
      },
      orderBy: [
        { year: 'desc' },
        { month: 'desc' },
      ],
    });

    return records;
  }

  // Get salary for teacher by userId (for /me endpoints)
  async getMySalary(userId: string) {
    const teacher = await this.prisma.teacher.findUnique({
      where: { userId },
    });

    if (!teacher) {
      throw new NotFoundException('Teacher profile not found');
    }

    return this.getCurrentSalary(teacher.id);
  }
}

