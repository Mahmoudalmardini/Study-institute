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
  UseInterceptors,
  ParseIntPipe,
  DefaultValuePipe,
} from '@nestjs/common';
import { CacheInterceptor } from '@nestjs/cache-manager';
import { SubjectsService } from './subjects.service';
import { CreateSubjectDto } from './dto/create-subject.dto';
import { UpdateSubjectDto } from './dto/update-subject.dto';
import { AssignTeacherDto } from './dto/assign-teacher.dto';
import { Roles } from '../../common/decorators/roles.decorator';
import { RolesGuard } from '../../common/guards/roles.guard';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import type { CurrentUserData } from '../../common/decorators/current-user.decorator';
import { Role } from '@prisma/client';

@Controller('subjects')
@UseGuards(JwtAuthGuard, RolesGuard)
export class SubjectsController {
  constructor(private readonly subjectsService: SubjectsService) {}

  @Post()
  @Roles(Role.ADMIN, Role.SUPERVISOR)
  create(@Body() createSubjectDto: CreateSubjectDto) {
    return this.subjectsService.create(createSubjectDto);
  }

  @Get()
  @Roles(Role.ADMIN, Role.SUPERVISOR, Role.TEACHER, Role.STUDENT)
  @UseInterceptors(CacheInterceptor)
  findAll(
    @Query('classId') classId?: string,
    @Query('page', new DefaultValuePipe(1), ParseIntPipe) page: number = 1,
    @Query('limit', new DefaultValuePipe(20), ParseIntPipe) limit: number = 20,
  ) {
    return this.subjectsService.findAll(classId, page, limit);
  }

  @Get(':id')
  @Roles(Role.ADMIN, Role.SUPERVISOR, Role.TEACHER)
  findOne(@Param('id') id: string) {
    return this.subjectsService.findOne(id);
  }

  @Patch(':id')
  @Roles(Role.ADMIN, Role.SUPERVISOR)
  update(@Param('id') id: string, @Body() updateSubjectDto: UpdateSubjectDto) {
    return this.subjectsService.update(id, updateSubjectDto);
  }

  @Delete(':id')
  @Roles(Role.ADMIN, Role.SUPERVISOR)
  remove(@Param('id') id: string) {
    return this.subjectsService.remove(id);
  }

  @Post(':id/assign-teacher')
  @Roles(Role.ADMIN, Role.SUPERVISOR)
  assignTeacher(
    @Param('id') id: string,
    @Body() assignTeacherDto: AssignTeacherDto,
    @CurrentUser() user: CurrentUserData,
  ) {
    return this.subjectsService.assignTeacher(
      id,
      assignTeacherDto.teacherId,
      user.id,
    );
  }

  @Delete(':id/unassign-teacher/:teacherId')
  @Roles(Role.ADMIN, Role.SUPERVISOR)
  unassignTeacher(
    @Param('id') id: string,
    @Param('teacherId') teacherId: string,
  ) {
    return this.subjectsService.unassignTeacher(id, teacherId);
  }

  @Get(':id/teachers')
  @Roles(Role.ADMIN, Role.SUPERVISOR, Role.TEACHER)
  getTeachers(@Param('id') id: string) {
    return this.subjectsService.getTeachersBySubject(id);
  }
}

