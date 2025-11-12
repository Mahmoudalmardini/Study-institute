import { Module, forwardRef } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module';
import { InstallmentsService } from './installments.service';
import { InstallmentsController } from './installments.controller';
import { StudentsModule } from '../students/students.module';

@Module({
  imports: [PrismaModule, forwardRef(() => StudentsModule)],
  controllers: [InstallmentsController],
  providers: [InstallmentsService],
  exports: [InstallmentsService],
})
export class InstallmentsModule {}

