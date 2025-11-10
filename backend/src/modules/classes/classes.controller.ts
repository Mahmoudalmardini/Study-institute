import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  UseGuards,
} from '@nestjs/common';
import { ClassesService } from './classes.service';
import { CreateClassDto } from './dto/create-class.dto';
import { UpdateClassDto } from './dto/update-class.dto';
import { AssignSubjectsDto } from './dto/assign-subjects.dto';
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
  findAll() {
    return this.classesService.findAll();
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
      assignSubjectsDto.subjectIds,
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
}

