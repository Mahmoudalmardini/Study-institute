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
import { GradesService } from './grades.service';
import { CreateGradeDto } from './dto/create-grade.dto';
import { UpdateGradeDto } from './dto/update-grade.dto';
import { Roles } from '../../common/decorators/roles.decorator';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Role } from '@prisma/client';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import type { CurrentUserData } from '../../common/decorators/current-user.decorator';

@Controller('grades')
@UseGuards(RolesGuard)
export class GradesController {
  constructor(private readonly gradesService: GradesService) {}

  @Post()
  @Roles(Role.TEACHER)
  create(
    @CurrentUser() user: CurrentUserData,
    @Body() createGradeDto: CreateGradeDto,
  ) {
    return this.gradesService.create(user.id, createGradeDto);
  }

  @Get()
  @Roles(Role.ADMIN, Role.SUPERVISOR, Role.TEACHER)
  @UseInterceptors(CacheInterceptor)
  findAll(
    @Query('studentId') studentId?: string,
    @Query('academicYear') academicYear?: string,
    @Query('term') term?: string,
    @Query('page', new DefaultValuePipe(1), ParseIntPipe) page: number = 1,
    @Query('limit', new DefaultValuePipe(20), ParseIntPipe) limit: number = 20,
  ) {
    return this.gradesService.findAll(studentId, academicYear, term, page, limit);
  }

  @Get('me')
  @Roles(Role.STUDENT)
  getMyGrades(@CurrentUser() user: CurrentUserData) {
    return this.gradesService.getMyGrades(user.id);
  }

  @Get(':id')
  @Roles(Role.ADMIN, Role.SUPERVISOR, Role.TEACHER, Role.STUDENT)
  findOne(@Param('id') id: string) {
    return this.gradesService.findOne(id);
  }

  @Patch(':id')
  @Roles(Role.TEACHER)
  update(
    @CurrentUser() user: CurrentUserData,
    @Param('id') id: string,
    @Body() updateGradeDto: UpdateGradeDto,
  ) {
    return this.gradesService.update(id, user.id, updateGradeDto);
  }

  @Delete(':id')
  @Roles(Role.TEACHER, Role.ADMIN)
  remove(@CurrentUser() user: CurrentUserData, @Param('id') id: string) {
    return this.gradesService.remove(id, user.id);
  }
}
