import {
  Controller,
  Get,
  Post,
  Delete,
  Param,
  Body,
  UseGuards,
} from '@nestjs/common';
import { StudentTeachersService } from './student-teachers.service';
import { Roles } from '../../common/decorators/roles.decorator';
import { RolesGuard } from '../../common/guards/roles.guard';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { Role } from '@prisma/client';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import type { CurrentUserData } from '../../common/decorators/current-user.decorator';

@Controller('student-teachers')
@UseGuards(JwtAuthGuard, RolesGuard)
export class StudentTeachersController {
  constructor(
    private readonly studentTeachersService: StudentTeachersService,
  ) {}

  @Post()
  @Roles(Role.ADMIN, Role.SUPERVISOR)
  assignTeacherToStudent(
    @Body() body: { studentId: string; teacherId: string },
    @CurrentUser() user: CurrentUserData,
  ) {
    return this.studentTeachersService.assignTeacherToStudent(
      body.studentId,
      body.teacherId,
      user.id,
    );
  }

  @Delete(':studentId/:teacherId')
  @Roles(Role.ADMIN, Role.SUPERVISOR)
  removeTeacherFromStudent(
    @Param('studentId') studentId: string,
    @Param('teacherId') teacherId: string,
  ) {
    return this.studentTeachersService.removeTeacherFromStudent(
      studentId,
      teacherId,
    );
  }

  @Get('student/:studentId')
  @Roles(Role.ADMIN, Role.SUPERVISOR, Role.TEACHER, Role.STUDENT)
  getStudentTeachers(@Param('studentId') studentId: string) {
    return this.studentTeachersService.getStudentTeachers(studentId);
  }

  @Get('teacher/:teacherId')
  @Roles(Role.ADMIN, Role.SUPERVISOR, Role.TEACHER)
  getTeacherStudents(@Param('teacherId') teacherId: string) {
    return this.studentTeachersService.getTeacherStudents(teacherId);
  }

  @Get()
  @Roles(Role.ADMIN, Role.SUPERVISOR)
  getAllAssignments() {
    return this.studentTeachersService.getAllAssignments();
  }
}
