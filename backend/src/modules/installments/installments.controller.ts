import {
  Controller,
  Get,
  Post,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
} from '@nestjs/common';
import { InstallmentsService } from './installments.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import type { CurrentUserData } from '../../common/decorators/current-user.decorator';
import { Role } from '@prisma/client';
import { CreateDiscountDto } from './dto/create-discount.dto';
import { CreatePaymentDto } from './dto/create-payment.dto';
import { CalculateInstallmentDto } from './dto/calculate-installment.dto';

@Controller('installments')
@UseGuards(JwtAuthGuard, RolesGuard)
export class InstallmentsController {
  constructor(private readonly installmentsService: InstallmentsService) {}

  @Get('student/:studentId')
  @Roles(Role.ADMIN, Role.SUPERVISOR)
  getStudentInstallments(
    @Param('studentId') studentId: string,
    @Query('year') year?: string,
  ) {
    return this.installmentsService.getStudentInstallments(
      studentId,
      year ? parseInt(year, 10) : undefined,
    );
  }

  @Get('student/:studentId/outstanding')
  @Roles(Role.ADMIN, Role.SUPERVISOR)
  getOutstandingBalance(@Param('studentId') studentId: string) {
    return this.installmentsService.getOutstandingBalance(studentId);
  }

  @Post('student/:studentId/calculate')
  @Roles(Role.ADMIN, Role.SUPERVISOR)
  calculateInstallment(
    @Param('studentId') studentId: string,
    @Body() calculateDto: CalculateInstallmentDto,
  ) {
    return this.installmentsService.calculateMonthlyInstallment(
      studentId,
      calculateDto.month,
      calculateDto.year,
    );
  }

  @Post('discounts')
  @Roles(Role.ADMIN)
  createDiscount(
    @CurrentUser() user: CurrentUserData,
    @Body() createDiscountDto: CreateDiscountDto,
  ) {
    return this.installmentsService.addDiscount(createDiscountDto, user.id);
  }

  @Delete('discounts/:discountId')
  @Roles(Role.ADMIN)
  cancelDiscount(@Param('discountId') discountId: string) {
    return this.installmentsService.cancelDiscount(discountId);
  }

  @Post('payments')
  @Roles(Role.ADMIN)
  recordPayment(
    @CurrentUser() user: CurrentUserData,
    @Body() createPaymentDto: CreatePaymentDto,
  ) {
    return this.installmentsService.recordPayment(createPaymentDto, user.id);
  }

  @Get('my-installments')
  @Roles(Role.STUDENT)
  async getMyInstallments(
    @CurrentUser() user: CurrentUserData,
    @Query('year') year?: string,
  ) {
    const studentId = await this.installmentsService.resolveStudentIdForUser(
      user.id,
    );
    return this.installmentsService.getStudentInstallments(
      studentId,
      year ? parseInt(year, 10) : undefined,
    );
  }

  @Get('my-outstanding')
  @Roles(Role.STUDENT)
  async getMyOutstanding(@CurrentUser() user: CurrentUserData) {
    const studentId = await this.installmentsService.resolveStudentIdForUser(
      user.id,
    );
    return this.installmentsService.getOutstandingBalance(studentId);
  }

  @Get('my-current-month')
  @Roles(Role.STUDENT)
  async getMyCurrentMonth(@CurrentUser() user: CurrentUserData) {
    const studentId = await this.installmentsService.resolveStudentIdForUser(
      user.id,
    );
    return this.installmentsService.getCurrentMonthInstallment(studentId);
  }
}

