import { Module } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module';
import { PointsService } from './points.service';
import { PointsController } from './points.controller';
import { TeachersModule } from '../teachers/teachers.module';

@Module({
	imports: [PrismaModule, TeachersModule],
	controllers: [PointsController],
	providers: [PointsService],
})
export class PointsModule {}
