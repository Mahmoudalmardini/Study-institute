import { Controller, Post, Body, UseGuards, Get, Query, Param } from '@nestjs/common';
import { PointsService } from './points.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import type { CurrentUserData } from '../../common/decorators/current-user.decorator';
import { Role } from '@prisma/client';
import { IsInt, IsOptional, IsString, IsUUID, NotEquals, IsArray } from 'class-validator';
import { Type } from 'class-transformer';

class CreatePointDto {
	@IsUUID()
	studentId!: string;

	@IsOptional()
	@IsString()
	subjectId?: string;

	@Type(() => Number)
	@IsInt()
	@NotEquals(0)
	amount!: number; // positive add, negative deduct
}

@Controller('points')
@UseGuards(JwtAuthGuard, RolesGuard)
export class PointsController {
	constructor(private readonly pointsService: PointsService) {}

	@Post()
	@Roles(Role.ADMIN, Role.SUPERVISOR, Role.TEACHER)
	create(@CurrentUser() user: CurrentUserData, @Body() dto: CreatePointDto) {
		return this.pointsService.createTransaction(user, dto);
	}

	@Get('students/:studentId/summary')
	@Roles(Role.ADMIN, Role.SUPERVISOR, Role.TEACHER)
	getStudentSummary(@CurrentUser() user: CurrentUserData, @Param('studentId') studentId: string, @Query('date') date?: string) {
		// If teacher, ensure they can view; admins/supervisors can always view
		if (user.role === 'TEACHER') {
			return this.pointsService
				['assertTeacherCanModifyStudent'](user.id, studentId)
				.then(() => this.pointsService.getSummaryForStudent(studentId, date));
		}
		return this.pointsService.getSummaryForStudent(studentId, date);
	}

	@Get('me/summary')
	@Roles(Role.STUDENT, Role.TEACHER, Role.ADMIN, Role.SUPERVISOR)
	getMySummary(@CurrentUser() user: CurrentUserData, @Query('date') date?: string) {
		if (user.role === 'STUDENT') {
			return this.pointsService
				.resolveStudentIdForUser(user.id)
				.then((studentId) => this.pointsService.getSummaryForStudent(studentId, date));
		}
		// For non-students, `me` doesn't map to a studentId; return empty
		return { total: 0, daily: 0, bySubject: [] };
	}

	@Get('students/:studentId/transactions')
	@Roles(Role.ADMIN, Role.SUPERVISOR, Role.TEACHER)
	list(@CurrentUser() user: CurrentUserData, @Param('studentId') studentId: string, @Query('limit') limit?: string, @Query('cursor') cursor?: string) {
		const lim = Math.max(1, Math.min(100, parseInt(limit || '50', 10)));
		if (user.role === 'TEACHER') {
			return this.pointsService
				['assertTeacherCanModifyStudent'](user.id, studentId)
				.then(() => this.pointsService.listTransactions(studentId, lim, cursor));
		}
		return this.pointsService.listTransactions(studentId, lim, cursor);
	}

	@Post('students/batch-summaries')
	@Roles(Role.ADMIN, Role.SUPERVISOR, Role.TEACHER)
	async getBatchSummaries(@CurrentUser() user: CurrentUserData, @Body() body: { studentIds: string[]; date?: string }) {
		const { studentIds, date } = body;
		if (!Array.isArray(studentIds) || studentIds.length === 0) {
			return {};
		}
		// Limit batch size to prevent abuse
		const limitedIds = studentIds.slice(0, 100);
		
		// For teachers, filter to only students they can access
		if (user.role === 'TEACHER') {
			const accessibleIds: string[] = [];
			for (const studentId of limitedIds) {
				try {
					await this.pointsService['assertTeacherCanModifyStudent'](user.id, studentId);
					accessibleIds.push(studentId);
				} catch {
					// Skip students teacher cannot access
				}
			}
			if (accessibleIds.length === 0) {
				return {};
			}
			return this.pointsService.getBatchSummaries(accessibleIds, date);
		}
		
		return this.pointsService.getBatchSummaries(limitedIds, date);
	}
}
