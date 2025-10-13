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
} from '@nestjs/common';
import { HomeworkService } from './homework.service';
import { CreateHomeworkDto } from './dto/create-homework.dto';
import { UpdateHomeworkDto } from './dto/update-homework.dto';
import { CreateSubmissionDto } from './dto/create-submission.dto';
import { GradeSubmissionDto } from './dto/grade-submission.dto';
import { Roles } from '../../common/decorators/roles.decorator';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Role } from '@prisma/client';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import type { CurrentUserData } from '../../common/decorators/current-user.decorator';

@Controller('homework')
@UseGuards(RolesGuard)
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

  @Get('submissions/me')
  @Roles(Role.STUDENT)
  getMySubmissions(
    @CurrentUser() user: CurrentUserData,
    @Query('homeworkId') homeworkId?: string,
  ) {
    return this.homeworkService.getMySubmissions(user.id, homeworkId);
  }

  @Get(':homeworkId/submissions')
  @Roles(Role.TEACHER, Role.ADMIN, Role.SUPERVISOR)
  getSubmissions(
    @CurrentUser() user: CurrentUserData,
    @Param('homeworkId') homeworkId: string,
  ) {
    const teacherId = user.role === Role.TEACHER ? user.id : undefined;
    return this.homeworkService.getSubmissions(homeworkId, teacherId);
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
}
