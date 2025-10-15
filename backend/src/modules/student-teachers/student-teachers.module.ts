import { Module } from '@nestjs/common';
import { StudentTeachersController } from './student-teachers.controller';
import { StudentTeachersService } from './student-teachers.service';
import { PrismaModule } from '../prisma/prisma.module';

@Module({
  imports: [PrismaModule],
  controllers: [StudentTeachersController],
  providers: [StudentTeachersService],
})
export class StudentTeachersModule {}

