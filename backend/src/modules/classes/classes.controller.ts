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
import { ClassesService } from './classes.service';
import { CreateClassDto } from './dto/create-class.dto';
import { UpdateClassDto } from './dto/update-class.dto';
import { AssignSubjectsDto } from './dto/assign-subjects.dto';
import { UpdateClassSubjectInstallmentDto } from './dto/update-class-subject-installment.dto';
import { Roles } from '../../common/decorators/roles.decorator';
import { RolesGuard } from '../../common/guards/roles.guard';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import type { CurrentUserData } from '../../common/decorators/current-user.decorator';
import { Role } from '@prisma/client';

@Controller('classes')
@UseGuards(JwtAuthGuard, RolesGuard)
export class ClassesController {
  constructor(private readonly classesService: ClassesService) {}

  @Post()
  @Roles(Role.ADMIN, Role.SUPERVISOR)
  create(@Body() createClassDto: CreateClassDto) {
    return this.classesService.create(createClassDto);
  }

  @Get()
  @Roles(Role.ADMIN, Role.SUPERVISOR, Role.TEACHER)
  @UseInterceptors(CacheInterceptor)
  findAll(
    @Query('page', new DefaultValuePipe(1), ParseIntPipe) page: number = 1,
    @Query('limit', new DefaultValuePipe(20), ParseIntPipe) limit: number = 20,
  ) {
    return this.classesService.findAll(page, limit);
  }

  @Get(':id')
  @Roles(Role.ADMIN, Role.SUPERVISOR, Role.TEACHER)
  findOne(@Param('id') id: string) {
    return this.classesService.findOne(id);
  }

  @Patch(':id')
  @Roles(Role.ADMIN, Role.SUPERVISOR)
  update(@Param('id') id: string, @Body() updateClassDto: UpdateClassDto) {
    return this.classesService.update(id, updateClassDto);
  }

  @Delete(':id')
  @Roles(Role.ADMIN, Role.SUPERVISOR)
  remove(@Param('id') id: string) {
    return this.classesService.remove(id);
  }

  @Post(':id/subjects')
  @Roles(Role.ADMIN, Role.SUPERVISOR)
  assignSubjects(
    @Param('id') id: string,
    @Body() assignSubjectsDto: AssignSubjectsDto,
    @CurrentUser() user: CurrentUserData,
  ) {
    return this.classesService.assignSubjects(
      id,
      assignSubjectsDto.subjects,
      user.id,
    );
  }

  @Delete(':id/subjects/:subjectId')
  @Roles(Role.ADMIN, Role.SUPERVISOR)
  unassignSubject(
    @Param('id') id: string,
    @Param('subjectId') subjectId: string,
  ) {
    return this.classesService.unassignSubject(id, subjectId);
  }

  @Get(':id/subjects')
  @Roles(Role.ADMIN, Role.SUPERVISOR, Role.TEACHER)
  getClassSubjects(@Param('id') id: string) {
    return this.classesService.getClassSubjects(id);
  }

  @Patch(':id/subjects/:subjectId/installment')
  @Roles(Role.ADMIN, Role.SUPERVISOR)
  updateClassSubjectInstallment(
    @Param('id') id: string,
    @Param('subjectId') subjectId: string,
    @Body() updateDto: UpdateClassSubjectInstallmentDto,
  ) {
    return this.classesService.updateClassSubjectInstallment(
      id,
      subjectId,
      updateDto.monthlyInstallment ?? null,
    );
  }
}

