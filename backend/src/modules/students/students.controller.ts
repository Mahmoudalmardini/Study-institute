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
import { StudentsService } from './students.service';
import { CreateStudentDto } from './dto/create-student.dto';
import { UpdateStudentDto } from './dto/update-student.dto';
import { EnrollSubjectsDto } from './dto/enroll-subjects.dto';
import { AssignClassesDto } from './dto/assign-classes.dto';
import { Roles } from '../../common/decorators/roles.decorator';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Role } from '@prisma/client';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import type { CurrentUserData } from '../../common/decorators/current-user.decorator';

@Controller('students')
@UseGuards(RolesGuard)
export class StudentsController {
  constructor(private readonly studentsService: StudentsService) {}

  @Post()
  @Roles(Role.ADMIN)
  create(@Body() createStudentDto: CreateStudentDto) {
    return this.studentsService.create(createStudentDto);
  }

  @Get()
  @Roles(Role.ADMIN, Role.SUPERVISOR, Role.TEACHER)
  findAll(@Query('classId') classId?: string) {
    return this.studentsService.findAll(classId);
  }

  @Get('me')
  @Roles(Role.STUDENT)
  getMyProfile(@CurrentUser() user: CurrentUserData) {
    return this.studentsService.findByUserId(user.id);
  }

  @Get(':id')
  @Roles(Role.ADMIN, Role.SUPERVISOR, Role.TEACHER)
  findOne(@Param('id') id: string) {
    return this.studentsService.findOne(id);
  }

  @Patch(':id')
  @Roles(Role.ADMIN, Role.SUPERVISOR)
  update(@Param('id') id: string, @Body() updateStudentDto: UpdateStudentDto) {
    return this.studentsService.update(id, updateStudentDto);
  }

  @Delete(':id')
  @Roles(Role.ADMIN)
  remove(@Param('id') id: string) {
    return this.studentsService.remove(id);
  }

  @Post(':id/enroll-subjects')
  @Roles(Role.ADMIN, Role.SUPERVISOR)
  enrollSubjects(
    @Param('id') id: string,
    @Body() enrollSubjectsDto: EnrollSubjectsDto,
    @CurrentUser() user: CurrentUserData,
  ) {
    return this.studentsService.enrollSubjects(
      id,
      enrollSubjectsDto.subjects,
      user.id,
    );
  }

  @Get(':id/subjects')
  @Roles(Role.ADMIN, Role.SUPERVISOR, Role.TEACHER, Role.STUDENT)
  getStudentSubjects(@Param('id') id: string) {
    return this.studentsService.getStudentSubjects(id);
  }

  @Post(':id/assign-classes')
  @Roles(Role.ADMIN, Role.SUPERVISOR)
  assignClasses(
    @Param('id') id: string,
    @Body() assignClassesDto: AssignClassesDto,
    @CurrentUser() user: CurrentUserData,
  ) {
    return this.studentsService.assignClasses(
      id,
      assignClassesDto.classIds,
      user.id,
    );
  }

  @Get(':id/classes')
  @Roles(Role.ADMIN, Role.SUPERVISOR, Role.TEACHER, Role.STUDENT)
  getStudentClasses(@Param('id') id: string) {
    return this.studentsService.getStudentClasses(id);
  }

  @Delete(':id/classes/:classId')
  @Roles(Role.ADMIN, Role.SUPERVISOR)
  removeStudentClass(
    @Param('id') id: string,
    @Param('classId') classId: string,
  ) {
    return this.studentsService.removeStudentClass(id, classId);
  }
}
