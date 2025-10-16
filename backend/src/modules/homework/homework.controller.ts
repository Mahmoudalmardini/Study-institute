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
  UploadedFiles,
  UseInterceptors,
} from '@nestjs/common';
import { FilesInterceptor } from '@nestjs/platform-express';
import { HomeworkService } from './homework.service';
import { CreateHomeworkDto } from './dto/create-homework.dto';
import { UpdateHomeworkDto } from './dto/update-homework.dto';
import { CreateSubmissionDto } from './dto/create-submission.dto';
import { GradeSubmissionDto } from './dto/grade-submission.dto';
import { TeacherEvaluateSubmissionDto } from './dto/teacher-evaluate-submission.dto';
import { AdminReviewSubmissionDto } from './dto/admin-review-submission.dto';
import { Roles } from '../../common/decorators/roles.decorator';
import { RolesGuard } from '../../common/guards/roles.guard';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { Role } from '@prisma/client';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import type { CurrentUserData } from '../../common/decorators/current-user.decorator';

@Controller('homework')
@UseGuards(JwtAuthGuard, RolesGuard)
export class HomeworkController {
  constructor(private readonly homeworkService: HomeworkService) {}

  @Post()
  @Roles(Role.TEACHER)
  create(
    @CurrentUser() user: CurrentUserData,
    @Body() createHomeworkDto: CreateHomeworkDto,
  ) {
    return this.homeworkService.create(user.id, createHomeworkDto);
  }

  @Get()
  @Roles(Role.ADMIN, Role.SUPERVISOR, Role.TEACHER, Role.STUDENT)
  findAll(
    @CurrentUser() user: CurrentUserData,
    @Query('classId') classId?: string,
  ) {
    const teacherId = user.role === Role.TEACHER ? user.id : undefined;
    return this.homeworkService.findAll(classId, teacherId);
  }

  // Specific routes must come before parameterized routes
  @Get('my-homework-results')
  @Roles(Role.STUDENT)
  getMyHomeworkResults(@CurrentUser() user: CurrentUserData) {
    return this.homeworkService.getStudentHomeworkResults(user.id);
  }

  @Get(':id')
  @Roles(Role.ADMIN, Role.SUPERVISOR, Role.TEACHER, Role.STUDENT)
  findOne(@Param('id') id: string) {
    return this.homeworkService.findOne(id);
  }

  @Patch(':id')
  @Roles(Role.TEACHER)
  update(
    @CurrentUser() user: CurrentUserData,
    @Param('id') id: string,
    @Body() updateHomeworkDto: UpdateHomeworkDto,
  ) {
    return this.homeworkService.update(id, user.id, updateHomeworkDto);
  }

  @Delete(':id')
  @Roles(Role.TEACHER, Role.ADMIN)
  remove(@CurrentUser() user: CurrentUserData, @Param('id') id: string) {
    return this.homeworkService.remove(id, user.id);
  }

  // Submission endpoints
  @Post('submissions')
  @Roles(Role.STUDENT)
  createSubmission(
    @CurrentUser() user: CurrentUserData,
    @Body() createSubmissionDto: CreateSubmissionDto,
  ) {
    return this.homeworkService.createSubmission(user.id, createSubmissionDto);
  }

  // Direct student submissions to teachers - MUST come before parameterized routes
  @Post('submit-to-teacher')
  @Roles(Role.STUDENT)
  @UseInterceptors(FilesInterceptor('files', 10))
  submitToTeacher(
    @CurrentUser() user: CurrentUserData,
    @Body() dto: any,
    @UploadedFiles() files: Express.Multer.File[],
  ) {
    console.log('[Controller] submitToTeacher called by user:', user.id);
    console.log('[Controller] submitToTeacher dto:', dto);
    console.log('[Controller] submitToTeacher files:', files);
    return this.homeworkService.submitToTeacher(user.id, dto, files);
  }

  // Prefer this path to avoid conflicts with ":homeworkId/submissions"
  @Get('submissions/received')
  @Roles(Role.TEACHER)
  async getTeacherSubmissionsReceived(@CurrentUser() user: CurrentUserData) {
    console.log('========================================');
    console.log('✅ ROUTE HIT: submissions/received');
    console.log('[Controller] getTeacherSubmissions called by user:', user.id);
    console.log('========================================');
    const result = await this.homeworkService.getTeacherSubmissions(user.id);
    console.log('Returning', result.length, 'submissions');
    return { success: true, data: result };
  }

  // Backward-compatibility alias (may conflict in some routers)
  @Get('teacher-submissions')
  @Roles(Role.TEACHER)
  async getTeacherSubmissions(@CurrentUser() user: CurrentUserData) {
    return this.getTeacherSubmissionsReceived(user);
  }

  @Get('submissions/me')
  @Roles(Role.STUDENT)
  getMySubmissions(
    @CurrentUser() user: CurrentUserData,
    @Query('homeworkId') homeworkId?: string,
  ) {
    return this.homeworkService.getMySubmissions(user.id, homeworkId);
  }

  @Patch('submissions/:submissionId/grade')
  @Roles(Role.TEACHER)
  gradeSubmission(
    @CurrentUser() user: CurrentUserData,
    @Param('submissionId') submissionId: string,
    @Body() gradeSubmissionDto: GradeSubmissionDto,
  ) {
    return this.homeworkService.gradeSubmission(
      submissionId,
      user.id,
      gradeSubmissionDto,
    );
  }

  // Admin Review Workflow Endpoints
  @Post('submissions/:submissionId/evaluate')
  @Roles(Role.TEACHER)
  teacherEvaluateSubmission(
    @CurrentUser() user: CurrentUserData,
    @Param('submissionId') submissionId: string,
    @Body() dto: TeacherEvaluateSubmissionDto,
  ) {
    return this.homeworkService.teacherEvaluateSubmission(
      submissionId,
      user.id,
      dto,
    );
  }

  @Get('submissions/pending-review')
  @Roles(Role.ADMIN)
  getSubmissionsPendingAdminReview() {
    return this.homeworkService.getSubmissionsPendingAdminReview();
  }

  @Post('submissions/:submissionId/admin-review')
  @Roles(Role.ADMIN)
  adminReviewSubmission(
    @CurrentUser() user: CurrentUserData,
    @Param('submissionId') submissionId: string,
    @Body() dto: AdminReviewSubmissionDto,
  ) {
    return this.homeworkService.adminReviewSubmission(
      submissionId,
      user.id,
      dto,
    );
  }

  // Parameterized routes MUST come after specific routes
  @Get(':homeworkId/submissions')
  @Roles(Role.TEACHER, Role.ADMIN, Role.SUPERVISOR)
  getSubmissions(
    @CurrentUser() user: CurrentUserData,
    @Param('homeworkId') homeworkId: string,
  ) {
    console.log('========================================');
    console.log('❌ WRONG ROUTE HIT: :homeworkId/submissions');
    console.log('[Controller] getSubmissions called with homeworkId:', homeworkId);
    console.log('[Controller] User:', user.id);
    console.log('========================================');
    const teacherId = user.role === Role.TEACHER ? user.id : undefined;
    return this.homeworkService.getSubmissions(homeworkId, teacherId);
  }
}
