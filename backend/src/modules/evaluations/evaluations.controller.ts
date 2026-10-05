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
import { EvaluationsService } from './evaluations.service';
import { CreateEvaluationDto } from './dto/create-evaluation.dto';
import { UpdateEvaluationDto } from './dto/update-evaluation.dto';
import { Roles } from '../../common/decorators/roles.decorator';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Role } from '@prisma/client';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import type { CurrentUserData } from '../../common/decorators/current-user.decorator';
import { PageQuery, LimitQuery } from '../../common/decorators/pagination-query.decorator';

@Controller('evaluations')
@UseGuards(RolesGuard)
export class EvaluationsController {
  constructor(private readonly evaluationsService: EvaluationsService) {}

  @Post()
  @Roles(Role.TEACHER)
  create(
    @CurrentUser() user: CurrentUserData,
    @Body() createEvaluationDto: CreateEvaluationDto,
  ) {
    return this.evaluationsService.create(user.id, createEvaluationDto);
  }

  @Get()
  @Roles(Role.ADMIN, Role.SUPERVISOR, Role.TEACHER)
  findAll(
    @Query('studentId') studentId: string | undefined,
    @Query('academicYear') academicYear: string | undefined,
    @Query('term') term: string | undefined,
    @PageQuery() page: number,
    @LimitQuery() limit: number,
  ) {
    return this.evaluationsService.findAll(studentId, academicYear, term, page, limit);
  }

  @Get('me')
  @Roles(Role.STUDENT)
  getMyEvaluations(@CurrentUser() user: CurrentUserData) {
    return this.evaluationsService.getMyEvaluations(user.id);
  }

  @Get(':id')
  @Roles(Role.ADMIN, Role.SUPERVISOR, Role.TEACHER, Role.STUDENT)
  findOne(@Param('id') id: string) {
    return this.evaluationsService.findOne(id);
  }

  @Patch(':id')
  @Roles(Role.TEACHER, Role.SUPERVISOR)
  update(
    @CurrentUser() user: CurrentUserData,
    @Param('id') id: string,
    @Body() updateEvaluationDto: UpdateEvaluationDto,
  ) {
    return this.evaluationsService.update(id, user.id, updateEvaluationDto);
  }

  @Delete(':id')
  @Roles(Role.TEACHER, Role.ADMIN)
  remove(@CurrentUser() user: CurrentUserData, @Param('id') id: string) {
    return this.evaluationsService.remove(id, user.id);
  }
}
