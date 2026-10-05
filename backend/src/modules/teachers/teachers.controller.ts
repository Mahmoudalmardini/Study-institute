import { Controller, Get, Param, Query, UseGuards } from '@nestjs/common';
import { TeachersService } from './teachers.service';
import { Roles } from '../../common/decorators/roles.decorator';
import { RolesGuard } from '../../common/guards/roles.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import type { CurrentUserData } from '../../common/decorators/current-user.decorator';
import { Role } from '@prisma/client';
import { PageQuery, LimitQuery } from '../../common/decorators/pagination-query.decorator';

@Controller('teachers')
@UseGuards(RolesGuard)
export class TeachersController {
  constructor(private readonly teachersService: TeachersService) {}

  @Get()
  @Roles(Role.ADMIN, Role.SUPERVISOR)
  findAll(
    @PageQuery() page: number,
    @LimitQuery() limit: number,
    @Query('search') search: string | undefined,
  ) {
    return this.teachersService.findAll(page, limit, search);
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

