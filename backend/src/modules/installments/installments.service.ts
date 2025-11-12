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
    });

    if (!student) {
      throw new NotFoundException(`Student with ID ${studentId} not found`);
    }

    // Get start and end of target month
    const monthStart = new Date(year, month - 1, 1);
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
            monthlyInstallment: true,
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

    for (const studentSubject of studentSubjects) {
      // Only include if enrolled during or before this month
      if (studentSubject.enrolledAt <= monthEnd) {
        const installment = studentSubject.subject.monthlyInstallment || 0;
        if (installment > 0) {
          totalAmount = totalAmount.add(installment);
          subjectBreakdown.push({
            subjectId: studentSubject.subject.id,
            subjectName: studentSubject.subject.name,
            amount: new Prisma.Decimal(installment),
            enrolledAt: studentSubject.enrolledAt,
          });
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
    if (previousInstallment && previousInstallment.outstandingAmount > 0) {
      outstandingFromPrevious = previousInstallment.outstandingAmount;
      totalAmount = totalAmount.add(outstandingFromPrevious);
    }

    // Get active discounts
    const activeDiscounts = await this.prisma.studentDiscount.findMany({
      where: {
        studentId,
        isActive: true,
      },
    });

    let discountAmount = new Prisma.Decimal(0);
    for (const discount of activeDiscounts) {
      discountAmount = discountAmount.add(discount.amount);
    }

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
        paidAmount,
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
    return this.prisma.studentInstallment.findUnique({
      where: {
        studentId_month_year: {
          studentId,
          month,
          year,
        },
      },
    }) || {
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

    if (!student) {
      throw new NotFoundException(`Student with ID ${studentId} not found`);
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

    const discount = await this.prisma.studentDiscount.create({
      data: {
        studentId: createDiscountDto.studentId,
        amount: createDiscountDto.amount,
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
    if (newPaidAmount.gte(finalAmount)) {
      status = 'PAID';
    } else if (newPaidAmount.gt(0)) {
      status = 'PARTIAL';
    }

    const updatedInstallment = await this.prisma.studentInstallment.update({
      where: { id: createPaymentDto.installmentId },
      data: {
        paidAmount: newPaidAmount,
        outstandingAmount: outstandingAmount.gte(0) ? outstandingAmount : new Prisma.Decimal(0),
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

    if (!student) {
      throw new NotFoundException(`Student with ID ${studentId} not found`);
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

