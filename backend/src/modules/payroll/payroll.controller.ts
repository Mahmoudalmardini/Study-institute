import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  Query,
  UseGuards,
  Logger,
  HttpException,
  HttpStatus,
} from '@nestjs/common';
import { PayrollService } from './payroll.service';
import {
  CreateSalaryDto,
  UpdateSalaryDto,
  SubmitHourRequestDto,
  ReviewHourRequestDto,
} from './dto';
import { Roles } from '../../common/decorators/roles.decorator';
import { RolesGuard } from '../../common/guards/roles.guard';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import type { CurrentUserData } from '../../common/decorators/current-user.decorator';
import { Role, HourRequestStatus } from '@prisma/client';

@Controller('payroll')
@UseGuards(JwtAuthGuard, RolesGuard)
export class PayrollController {
  private readonly logger = new Logger(PayrollController.name);

  constructor(private readonly payrollService: PayrollService) {}

  // Health check endpoint - Check if payroll tables exist
  @Get('health')
  @Roles(Role.ADMIN, Role.SUPERVISOR)
  async checkPayrollHealth() {
    try {
      return await this.payrollService.checkPayrollTables();
    } catch (error: any) {
      this.logger.error('Error in checkPayrollHealth:', error.stack || error.message);
      throw new HttpException(
        {
          statusCode: HttpStatus.INTERNAL_SERVER_ERROR,
          message: error.message || 'Failed to check payroll health',
          error: 'Internal Server Error',
        },
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  // Admin: Get all teachers with salaries
  @Get('salaries')
  @Roles(Role.ADMIN, Role.SUPERVISOR)
  async getAllSalaries(@Query('search') search?: string) {
    try {
      return await this.payrollService.getAllSalaries(search);
    } catch (error: any) {
      this.logger.error('Error in getAllSalaries:', error.stack || error.message);
      throw new HttpException(
        {
          statusCode: HttpStatus.INTERNAL_SERVER_ERROR,
          message: error.message || 'Failed to fetch salaries',
          error: 'Internal Server Error',
        },
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  // Admin: Create salary for a teacher
  @Post('salaries')
  @Roles(Role.ADMIN)
  createSalary(
    @CurrentUser() user: CurrentUserData,
    @Body() dto: CreateSalaryDto,
  ) {
    return this.payrollService.createSalary(user.id, dto);
  }

  // Admin: Update salary for a teacher
  @Patch('salaries/:id')
  @Roles(Role.ADMIN)
  updateSalary(
    @CurrentUser() user: CurrentUserData,
    @Param('id') id: string,
    @Body() dto: UpdateSalaryDto,
  ) {
    return this.payrollService.updateSalary(user.id, id, dto);
  }

  // Admin: Delete salary
  @Delete('salaries/:id')
  @Roles(Role.ADMIN)
  deleteSalary(
    @CurrentUser() user: CurrentUserData,
    @Param('id') id: string,
  ) {
    return this.payrollService.deleteSalary(user.id, id);
  }

  // Get current salary by teacher ID (Admin/Supervisor)
  @Get('salaries/current/:teacherId')
  @Roles(Role.ADMIN, Role.SUPERVISOR)
  getCurrentSalary(@Param('teacherId') teacherId: string) {
    return this.payrollService.getCurrentSalary(teacherId);
  }

  // Teacher: Get own current salary
  @Get('salaries/me')
  @Roles(Role.TEACHER)
  getMySalary(@CurrentUser() user: CurrentUserData) {
    return this.payrollService.getMySalary(user.id);
  }

  // Teacher: Submit hour request
  @Post('hour-requests')
  @Roles(Role.TEACHER)
  submitHourRequest(
    @CurrentUser() user: CurrentUserData,
    @Body() dto: SubmitHourRequestDto,
  ) {
    return this.payrollService.submitHourRequest(user.id, dto);
  }

  // Teacher: Get own hour requests
  @Get('hour-requests/me')
  @Roles(Role.TEACHER)
  getMyHourRequests(
    @CurrentUser() user: CurrentUserData,
    @Query('status') status?: HourRequestStatus,
  ) {
    return this.payrollService.getHourRequests(user.id, status);
  }

  // Admin: Get all pending hour requests
  @Get('hour-requests/pending')
  @Roles(Role.ADMIN)
  async getPendingHourRequests() {
    try {
      return await this.payrollService.getPendingHourRequests();
    } catch (error: any) {
      this.logger.error('Error in getPendingHourRequests:', error.stack || error.message);
      throw new HttpException(
        {
          statusCode: HttpStatus.INTERNAL_SERVER_ERROR,
          message: error.message || 'Failed to fetch pending hour requests',
          error: 'Internal Server Error',
        },
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  // Admin: Review hour request (approve/reject/modify)
  @Patch('hour-requests/:id/review')
  @Roles(Role.ADMIN)
  reviewHourRequest(
    @CurrentUser() user: CurrentUserData,
    @Param('id') id: string,
    @Body() dto: ReviewHourRequestDto,
  ) {
    return this.payrollService.reviewHourRequest(user.id, id, dto);
  }

  // Teacher: Get monthly payroll records
  @Get('records/me')
  @Roles(Role.TEACHER)
  getMyMonthlyRecords(@CurrentUser() user: CurrentUserData) {
    return this.payrollService.getMonthlyRecords(user.id);
  }

  // Teacher: Get specific monthly record
  @Get('records/me/:month/:year')
  @Roles(Role.TEACHER)
  getMyMonthlyRecord(
    @CurrentUser() user: CurrentUserData,
    @Param('month') month: string,
    @Param('year') year: string,
  ) {
    return this.payrollService.getMonthlyRecord(
      user.id,
      parseInt(month),
      parseInt(year),
    );
  }

  // Admin/Supervisor: Get all monthly records
  @Get('records')
  @Roles(Role.ADMIN, Role.SUPERVISOR)
  getAllMonthlyRecords(
    @Query('month') month?: string,
    @Query('year') year?: string,
  ) {
    return this.payrollService.getAllMonthlyRecords(
      month ? parseInt(month) : undefined,
      year ? parseInt(year) : undefined,
    );
  }

  // Admin/Supervisor: Get specific teacher's monthly record
  @Get('records/:teacherId/:month/:year')
  @Roles(Role.ADMIN, Role.SUPERVISOR)
  getTeacherMonthlyRecord(
    @Param('teacherId') teacherId: string,
    @Param('month') month: string,
    @Param('year') year: string,
  ) {
    // teacherId here is actually the teacher.id (not userId)
    return this.payrollService.getMonthlyRecord(
      teacherId,
      parseInt(month),
      parseInt(year),
      false, // isUserId = false, meaning teacherId is the actual teacher.id
    );
  }
}

