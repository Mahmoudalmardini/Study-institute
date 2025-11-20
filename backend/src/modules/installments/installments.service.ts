import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateDiscountDto } from './dto/create-discount.dto';
import { CreatePaymentDto } from './dto/create-payment.dto';
import { UpdateInstallmentDto } from './dto/update-installment.dto';
import { CalculateInstallmentDto } from './dto/calculate-installment.dto';
import { Prisma } from '@prisma/client';

@Injectable()
export class InstallmentsService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Calculate monthly installment for a student based on enrolled subjects
   * Only includes subjects where student was enrolled during the target month
   */
  async calculateMonthlyInstallment(
    studentId: string,
    month: number,
    year: number,
  ) {
    // Validate student exists
    const student = await this.prisma.student.findUnique({
      where: { id: studentId },
      include: {
        class: true,
      },
    });

    if (!student) {
      throw new NotFoundException(`Student with ID ${studentId} not found`);
    }

    // Get start and end of target month
    // month parameter is 1-12, JavaScript Date uses 0-11 for months
    const monthStart = new Date(year, month - 1, 1);
    // To get last day of month (1-12), use month+1: new Date(year, month+1, 0)
    // new Date(year, month, 0) gives last day of (month-1), so we need month+1 to get last day of target month
    // Example: month=5 (May) -> new Date(2025, 6, 0) = May 31, 2025
    const monthEnd = new Date(year, month, 0, 23, 59, 59, 999);

    // Get all subjects the student is enrolled in
    const studentSubjects = await this.prisma.studentSubject.findMany({
      where: {
        studentId,
        enrolledAt: {
          lte: monthEnd, // Enrolled before or during the month
        },
      },
      include: {
        subject: {
          select: {
            id: true,
            name: true,
          },
        },
      },
    });

    // Calculate total from subjects enrolled during this month
    let totalAmount = new Prisma.Decimal(0);
    const subjectBreakdown: Array<{
      subjectId: string;
      subjectName: string;
      amount: Prisma.Decimal;
      enrolledAt: Date;
    }> = [];

    // If student has no class, skip installment calculation for subjects (log warning)
    if (!student.classId) {
      console.warn(
        `Student ${studentId} has no class assigned. Skipping installment calculation.`,
      );
      // Still create installment record with 0 amount
    } else {
      // Get all class-subject relationships for the student's class
      const classSubjects = await this.prisma.classSubject.findMany({
        where: {
          classId: student.classId,
        },
        include: {
          subject: {
            select: {
              id: true,
              name: true,
            },
          },
        },
      });

      // Create a map for quick lookup
      const classSubjectMap = new Map(
        classSubjects.map((cs) => [cs.subjectId, cs]),
      );

      for (const studentSubject of studentSubjects) {
        // Only include if enrolled during or before this month
        if (studentSubject.enrolledAt <= monthEnd) {
          // Look up the class-subject relationship to get the installment amount
          const classSubject = classSubjectMap.get(studentSubject.subjectId);

          if (classSubject && classSubject.monthlyInstallment) {
            const installmentAmount = new Prisma.Decimal(
              classSubject.monthlyInstallment,
            );
            if (installmentAmount.gt(0)) {
              totalAmount = totalAmount.add(installmentAmount);
              subjectBreakdown.push({
                subjectId: studentSubject.subject.id,
                subjectName: studentSubject.subject.name,
                amount: installmentAmount,
                enrolledAt: studentSubject.enrolledAt,
              });
            }
          } else if (classSubject === undefined) {
            // Subject is enrolled but not assigned to the student's class
            console.warn(
              `Subject ${studentSubject.subjectId} (${studentSubject.subject.name}) is enrolled for student ${studentId} but not assigned to class ${student.classId}. Skipping installment.`,
            );
          }
          // If classSubject exists but monthlyInstallment is null/0, skip (no charge)
        }
      }
    }

    // Get outstanding from previous month
    const previousMonth = month === 1 ? 12 : month - 1;
    const previousYear = month === 1 ? year - 1 : year;
    const previousInstallment = await this.prisma.studentInstallment.findUnique(
      {
        where: {
          studentId_month_year: {
            studentId,
            month: previousMonth,
            year: previousYear,
          },
        },
      },
    );

    let outstandingFromPrevious = new Prisma.Decimal(0);
    if (previousInstallment) {
      const prevOutstanding = previousInstallment.outstandingAmount;
      if (prevOutstanding.gt(0)) {
        // Positive outstanding: add to current month's total
        outstandingFromPrevious = prevOutstanding;
        totalAmount = totalAmount.add(outstandingFromPrevious);
      } else if (prevOutstanding.lt(0)) {
        // Negative outstanding (overpayment): subtract from current month's total
        outstandingFromPrevious = prevOutstanding;
        totalAmount = totalAmount.add(outstandingFromPrevious); // Adding negative = subtracting
      }
    }

    // Get active discounts
    const activeDiscounts = await this.prisma.studentDiscount.findMany({
      where: {
        studentId,
        isActive: true,
      },
    });

    let fixedDiscountTotal = new Prisma.Decimal(0);
    let percentageDiscountTotal = new Prisma.Decimal(0);

    for (const discount of activeDiscounts) {
      if (discount.percent && discount.percent.gt(0)) {
        percentageDiscountTotal = percentageDiscountTotal.add(discount.percent);
      } else if (discount.amount && discount.amount.gt(0)) {
        fixedDiscountTotal = fixedDiscountTotal.add(discount.amount);
      }
    }

    if (percentageDiscountTotal.gt(100)) {
      percentageDiscountTotal = new Prisma.Decimal(100);
    }

    const percentageDiscountAmount = percentageDiscountTotal.gt(0)
      ? totalAmount.mul(percentageDiscountTotal).div(new Prisma.Decimal(100))
      : new Prisma.Decimal(0);

    const discountAmount = fixedDiscountTotal.add(percentageDiscountAmount);

    // Calculate final amounts
    const finalAmount = totalAmount.minus(discountAmount);
    const currentInstallment = await this.getOrCreateInstallment(
      studentId,
      month,
      year,
    );

    const paidAmount = currentInstallment.paidAmount || new Prisma.Decimal(0);
    const outstandingAmount = finalAmount.minus(paidAmount);

    // Determine status
    let status: 'PENDING' | 'PARTIAL' | 'PAID' | 'OVERDUE' = 'PENDING';
    if (paidAmount.gte(finalAmount)) {
      status = 'PAID';
    } else if (paidAmount.gt(0)) {
      status = 'PARTIAL';
    } else {
      const now = new Date();
      const currentMonth = now.getMonth() + 1;
      const currentYear = now.getFullYear();
      if (year < currentYear || (year === currentYear && month < currentMonth)) {
        status = 'OVERDUE';
      }
    }

    // Update or create installment
    // Always create/update installment even if totalAmount is 0 (student might have subjects without installments yet)
    const installment = await this.prisma.studentInstallment.upsert({
      where: {
        studentId_month_year: {
          studentId,
          month,
          year,
        },
      },
      update: {
        totalAmount,
        discountAmount,
        outstandingAmount: outstandingAmount.gte(0) ? outstandingAmount : new Prisma.Decimal(0),
        status,
      },
      create: {
        studentId,
        month,
        year,
        totalAmount,
        paidAmount: paidAmount || new Prisma.Decimal(0),
        discountAmount,
        outstandingAmount: outstandingAmount.gte(0) ? outstandingAmount : new Prisma.Decimal(0),
        status,
      },
    });

    return {
      installment,
      subjectBreakdown,
      outstandingFromPrevious: outstandingFromPrevious.toString(),
      activeDiscounts: activeDiscounts.length,
      totalDiscountAmount: discountAmount.toString(),
    };
  }

  /**
   * Get or create installment record
   */
  private async getOrCreateInstallment(
    studentId: string,
    month: number,
    year: number,
  ) {
    const existing = await this.prisma.studentInstallment.findUnique({
      where: {
        studentId_month_year: {
          studentId,
          month,
          year,
        },
      },
    });
    
    if (existing) {
      return existing;
    }
    
    return {
      studentId,
      month,
      year,
      totalAmount: new Prisma.Decimal(0),
      paidAmount: new Prisma.Decimal(0),
      outstandingAmount: new Prisma.Decimal(0),
      discountAmount: new Prisma.Decimal(0),
      status: 'PENDING' as const,
    };
  }

  /**
   * Get all installments for a student
   */
  async getStudentInstallments(studentId: string, year?: number) {
    const student = await this.prisma.student.findUnique({
      where: { id: studentId },
    });

    // Return empty array if student doesn't exist (instead of 404)
    // This allows the frontend to handle missing students gracefully
    if (!student) {
      return [];
    }

    const where: Prisma.StudentInstallmentWhereInput = { studentId };
    if (year) {
      where.year = year;
    }

    return this.prisma.studentInstallment.findMany({
      where,
      orderBy: [
        { year: 'desc' },
        { month: 'desc' },
      ],
      include: {
        payments: {
          orderBy: { paymentDate: 'desc' },
          include: {
            installment: {
              select: {
                month: true,
                year: true,
              },
            },
          },
        },
      },
    });
  }

  /**
   * Create or update installment record
   */
  async createOrUpdateInstallment(
    studentId: string,
    month: number,
    year: number,
  ) {
    return this.calculateMonthlyInstallment(studentId, month, year);
  }

  /**
   * Add discount for a student
   */
  async addDiscount(
    createDiscountDto: CreateDiscountDto,
    createdBy: string,
  ) {
    const student = await this.prisma.student.findUnique({
      where: { id: createDiscountDto.studentId },
    });

    if (!student) {
      throw new NotFoundException(
        `Student with ID ${createDiscountDto.studentId} not found`,
      );
    }

    const hasAmount =
      typeof createDiscountDto.amount === 'number' &&
      !isNaN(createDiscountDto.amount) &&
      createDiscountDto.amount > 0;
    const hasPercent =
      typeof createDiscountDto.percent === 'number' &&
      !isNaN(createDiscountDto.percent) &&
      createDiscountDto.percent > 0;

    if ((hasAmount && hasPercent) || (!hasAmount && !hasPercent)) {
      throw new BadRequestException(
        'Please provide either a discount amount or a discount percentage.',
      );
    }

    let percentValue = new Prisma.Decimal(0);
    if (hasPercent) {
      percentValue = new Prisma.Decimal(createDiscountDto.percent!);
      if (percentValue.lte(0) || percentValue.gt(100)) {
        throw new BadRequestException(
          'Discount percentage must be greater than 0 and no more than 100.',
        );
      }

      const activePercentAggregate = await this.prisma.studentDiscount.aggregate({
        where: {
          studentId: createDiscountDto.studentId,
          isActive: true,
          percent: {
            not: null,
          },
        },
        _sum: {
          percent: true,
        },
      });

      const existingPercent = new Prisma.Decimal(
        activePercentAggregate._sum.percent || 0,
      );
      if (existingPercent.add(percentValue).gt(100)) {
        throw new BadRequestException(
          'Total percentage-based discounts for a student cannot exceed 100%.',
        );
      }
    }

    let discountAmount = new Prisma.Decimal(0);
    if (hasAmount) {
      // Get total outstanding balance
      const outstandingBalance = await this.getOutstandingBalance(
        createDiscountDto.studentId,
      );
      const totalOutstanding = new Prisma.Decimal(
        outstandingBalance.totalOutstanding,
      );
      discountAmount = new Prisma.Decimal(createDiscountDto.amount!);

      // Validate discount amount doesn't exceed total outstanding
      if (discountAmount.gt(totalOutstanding)) {
        throw new BadRequestException(
          `Discount amount (${discountAmount.toString()}) cannot exceed total outstanding balance (${totalOutstanding.toString()})`,
        );
      }
    }

    const discount = await this.prisma.studentDiscount.create({
      data: {
        studentId: createDiscountDto.studentId,
        amount: hasAmount ? discountAmount : new Prisma.Decimal(0),
        percent: hasPercent ? percentValue : null,
        reason: createDiscountDto.reason,
        createdBy,
        isActive: true,
      },
    });

    // Recalculate current month's installment
    const now = new Date();
    await this.calculateMonthlyInstallment(
      createDiscountDto.studentId,
      now.getMonth() + 1,
      now.getFullYear(),
    );

    return discount;
  }

  /**
   * Cancel discount
   */
  async cancelDiscount(discountId: string) {
    const discount = await this.prisma.studentDiscount.findUnique({
      where: { id: discountId },
    });

    if (!discount) {
      throw new NotFoundException(`Discount with ID ${discountId} not found`);
    }

    const updated = await this.prisma.studentDiscount.update({
      where: { id: discountId },
      data: {
        isActive: false,
        cancelledAt: new Date(),
      },
    });

    // Recalculate current month's installment
    const now = new Date();
    await this.calculateMonthlyInstallment(
      discount.studentId,
      now.getMonth() + 1,
      now.getFullYear(),
    );

    return updated;
  }

  /**
   * Record payment
   */
  async recordPayment(
    createPaymentDto: CreatePaymentDto,
    recordedBy: string,
  ) {
    const student = await this.prisma.student.findUnique({
      where: { id: createPaymentDto.studentId },
    });

    if (!student) {
      throw new NotFoundException(
        `Student with ID ${createPaymentDto.studentId} not found`,
      );
    }

    const installment = await this.prisma.studentInstallment.findUnique({
      where: { id: createPaymentDto.installmentId },
    });

    if (!installment) {
      throw new NotFoundException(
        `Installment with ID ${createPaymentDto.installmentId} not found`,
      );
    }

    if (installment.studentId !== createPaymentDto.studentId) {
      throw new BadRequestException(
        'Installment does not belong to the specified student',
      );
    }

    // Create payment record
    const payment = await this.prisma.paymentRecord.create({
      data: {
        studentId: createPaymentDto.studentId,
        installmentId: createPaymentDto.installmentId,
        amount: createPaymentDto.amount,
        paymentDate: new Date(createPaymentDto.paymentDate),
        paymentMethod: createPaymentDto.paymentMethod,
        notes: createPaymentDto.notes,
        recordedBy,
      },
    });

    // Update installment
    const newPaidAmount = installment.paidAmount.add(createPaymentDto.amount);
    const finalAmount = installment.totalAmount.minus(installment.discountAmount);
    const outstandingAmount = finalAmount.minus(newPaidAmount);

    let status: 'PENDING' | 'PARTIAL' | 'PAID' | 'OVERDUE' = installment.status;
    // If paid amount is greater than or equal to final amount (including overpayment), mark as PAID
    if (newPaidAmount.gte(finalAmount)) {
      status = 'PAID';
    } else if (newPaidAmount.gt(0)) {
      status = 'PARTIAL';
    }

    const updatedInstallment = await this.prisma.studentInstallment.update({
      where: { id: createPaymentDto.installmentId },
      data: {
        paidAmount: newPaidAmount,
        // Allow negative outstanding amounts (overpayment)
        outstandingAmount,
        status,
      },
    });

    return {
      payment,
      installment: updatedInstallment,
    };
  }

  /**
   * Get outstanding balance for a student
   */
  async getOutstandingBalance(studentId: string) {
    const student = await this.prisma.student.findUnique({
      where: { id: studentId },
    });

    // Return empty data if student doesn't exist (instead of 404)
    // This allows the frontend to handle missing students gracefully
    if (!student) {
      return {
        totalOutstanding: '0',
        installments: [],
        count: 0,
      };
    }

    const installments = await this.prisma.studentInstallment.findMany({
      where: {
        studentId,
        outstandingAmount: {
          gt: 0,
        },
      },
      orderBy: [
        { year: 'asc' },
        { month: 'asc' },
      ],
    });

    let totalOutstanding = new Prisma.Decimal(0);
    for (const installment of installments) {
      totalOutstanding = totalOutstanding.add(installment.outstandingAmount);
    }

    return {
      totalOutstanding: totalOutstanding.toString(),
      installments,
      count: installments.length,
    };
  }

  /**
   * Get current month installment summary for a student
   */
  async getCurrentMonthInstallment(studentId: string) {
    const now = new Date();
    const month = now.getMonth() + 1;
    const year = now.getFullYear();

    return this.calculateMonthlyInstallment(studentId, month, year);
  }

  /**
   * Resolve student ID from user ID
   */
  async resolveStudentIdForUser(userId: string): Promise<string> {
    const student = await this.prisma.student.findUnique({
      where: { userId },
      select: { id: true },
    });
    if (!student) {
      throw new NotFoundException('Student not found for this user');
    }
    return student.id;
  }
}

