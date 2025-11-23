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
import { AnnouncementsService } from './announcements.service';
import { CreateAnnouncementDto } from './dto/create-announcement.dto';
import { UpdateAnnouncementDto } from './dto/update-announcement.dto';
import { Roles } from '../../common/decorators/roles.decorator';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Role } from '@prisma/client';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import type { CurrentUserData } from '../../common/decorators/current-user.decorator';

@Controller('announcements')
@UseGuards(RolesGuard)
export class AnnouncementsController {
  constructor(private readonly announcementsService: AnnouncementsService) {}

  @Post()
  @Roles(Role.ADMIN, Role.SUPERVISOR, Role.TEACHER)
  create(
    @CurrentUser() user: CurrentUserData,
    @Body() createAnnouncementDto: CreateAnnouncementDto,
  ) {
    return this.announcementsService.create(user.id, createAnnouncementDto);
  }

  @Get()
  @Roles(Role.ADMIN, Role.SUPERVISOR, Role.TEACHER, Role.STUDENT)
  @UseInterceptors(CacheInterceptor)
  findAll(
    @CurrentUser() user: CurrentUserData,
    @Query('page', new DefaultValuePipe(1), ParseIntPipe) page: number = 1,
    @Query('limit', new DefaultValuePipe(20), ParseIntPipe) limit: number = 20,
  ) {
    return this.announcementsService.findAll(user.role as Role, page, limit);
  }

  @Get(':id')
  @Roles(Role.ADMIN, Role.SUPERVISOR, Role.TEACHER, Role.STUDENT)
  findOne(@Param('id') id: string) {
    return this.announcementsService.findOne(id);
  }

  @Patch(':id')
  @Roles(Role.ADMIN, Role.SUPERVISOR, Role.TEACHER)
  update(
    @CurrentUser() user: CurrentUserData,
    @Param('id') id: string,
    @Body() updateAnnouncementDto: UpdateAnnouncementDto,
  ) {
    return this.announcementsService.update(
      id,
      user.id,
      user.role as Role,
      updateAnnouncementDto,
    );
  }

  @Delete(':id')
  @Roles(Role.ADMIN, Role.SUPERVISOR, Role.TEACHER)
  remove(@CurrentUser() user: CurrentUserData, @Param('id') id: string) {
    return this.announcementsService.remove(id, user.id, user.role as Role);
  }
}
