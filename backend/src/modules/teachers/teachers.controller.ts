import { Controller, Get, Param, UseGuards } from '@nestjs/common';
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
  findAll() {
    return this.teachersService.findAll();
  }

  @Get('me')
  @Roles(Role.TEACHER)
  getMyProfile(@CurrentUser() user: CurrentUserData) {
    return this.teachersService.findByUserId(user.id);
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

