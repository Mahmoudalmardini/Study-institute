import { Controller, Get, Param, Query, UseGuards, UseInterceptors, ParseIntPipe, DefaultValuePipe } from '@nestjs/common';
import { CacheInterceptor } from '@nestjs/cache-manager';
import { TeachersService } from './teachers.service';
import { Roles } from '../../common/decorators/roles.decorator';
import { RolesGuard } from '../../common/guards/roles.guard';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import type { CurrentUserData } from '../../common/decorators/current-user.decorator';
import { Role } from '@prisma/client';

@Controller('teachers')
@UseGuards(JwtAuthGuard, RolesGuard)
export class TeachersController {
  constructor(private readonly teachersService: TeachersService) {}

  @Get()
  @Roles(Role.ADMIN, Role.SUPERVISOR)
  @UseInterceptors(CacheInterceptor)
  findAll(
    @Query('page', new DefaultValuePipe(1), ParseIntPipe) page: number = 1,
    @Query('limit', new DefaultValuePipe(20), ParseIntPipe) limit: number = 20,
  ) {
    return this.teachersService.findAll(page, limit);
  }

  @Get('me')
  @Roles(Role.TEACHER)
  getMyProfile(@CurrentUser() user: CurrentUserData) {
    return this.teachersService.findByUserId(user.id);
  }

  @Get('me/students')
  @Roles(Role.TEACHER)
  getMyStudents(@CurrentUser() user: CurrentUserData) {
    return this.teachersService.getMyStudents(user.id);
  }

  @Get(':id')
  @Roles(Role.ADMIN, Role.SUPERVISOR, Role.TEACHER)
  findOne(@Param('id') id: string) {
    return this.teachersService.findOne(id);
  }

  @Get(':id/subjects')
  @Roles(Role.ADMIN, Role.SUPERVISOR, Role.TEACHER)
  getTeacherSubjects(@Param('id') id: string) {
    return this.teachersService.getTeacherSubjects(id);
  }
}

