import { Module } from '@nestjs/common';
import { ServeStaticModule } from '@nestjs/serve-static';
import { join } from 'path';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { APP_GUARD, APP_FILTER, APP_INTERCEPTOR } from '@nestjs/core';
import { ThrottlerModule, ThrottlerGuard } from '@nestjs/throttler';
import { CacheModule } from '@nestjs/cache-manager';
import { ScheduleModule } from '@nestjs/schedule';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import configuration from './config/configuration';
import { PrismaModule } from './modules/prisma/prisma.module';
import { AuthModule } from './modules/auth/auth.module';
import { UsersModule } from './modules/users/users.module';
import { StudentsModule } from './modules/students/students.module';
import { HomeworkModule } from './modules/homework/homework.module';
import { GradesModule } from './modules/grades/grades.module';
import { AnnouncementsModule } from './modules/announcements/announcements.module';
import { EvaluationsModule } from './modules/evaluations/evaluations.module';
import { StudentTeachersModule } from './modules/student-teachers/student-teachers.module';
import { ClassesModule } from './modules/classes/classes.module';
import { SubjectsModule } from './modules/subjects/subjects.module';
import { TeachersModule } from './modules/teachers/teachers.module';
import { JwtAuthGuard } from './common/guards/jwt-auth.guard';
import { AllExceptionsFilter } from './common/filters/http-exception.filter';
import { TransformInterceptor } from './common/interceptors/transform.interceptor';
import { PointsModule } from './modules/points/points.module';
import { PayrollModule } from './modules/payroll/payroll.module';
import { InstallmentsModule } from './modules/installments/installments.module';
import { FilesModule } from './modules/files/files.module';
import { HealthModule } from './health/health.module';

@Module({
  imports: [
    // Serve uploaded files at /uploads/*
    ServeStaticModule.forRoot({
      rootPath: join(process.cwd(), 'uploads'),
      serveRoot: '/uploads',
      serveStaticOptions: {
        index: false, // Disable directory index (don't serve index.html)
        fallthrough: false, // Don't fall through to other handlers
      },
    }),
    ConfigModule.forRoot({
      isGlobal: true,
      load: [configuration],
    }),
    ScheduleModule.forRoot(),
    CacheModule.registerAsync({
      isGlobal: true,
      inject: [ConfigService],
      useFactory: async (config: ConfigService) => {
        // Configure cache with default TTL
        // Redis store can be configured later when @nestjs/cache-manager supports NestJS 11
        return {
          ttl: 300, // 5 minutes default TTL
          max: 1000, // Maximum number of items in cache
        };
      },
    }),
    ThrottlerModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (config: ConfigService) => [
        {
          ttl: config.get('throttle.ttl') * 1000, // Convert seconds to milliseconds
          limit: config.get('throttle.limit') || 10,
        },
      ],
    }),
    PrismaModule,
    AuthModule,
    UsersModule,
    StudentsModule,
    HomeworkModule,
    GradesModule,
    AnnouncementsModule,
    EvaluationsModule,
    StudentTeachersModule,
    ClassesModule,
    SubjectsModule,
    TeachersModule,
    PointsModule,
    PayrollModule,
    InstallmentsModule,
    FilesModule,
    HealthModule,
  ],
  controllers: [AppController],
  providers: [
    AppService,
    {
      provide: APP_GUARD,
      useClass: JwtAuthGuard,
    },
    {
      provide: APP_GUARD,
      useClass: ThrottlerGuard,
    },
    {
      provide: APP_FILTER,
      useClass: AllExceptionsFilter,
    },
    {
      provide: APP_INTERCEPTOR,
      useClass: TransformInterceptor,
    },
  ],
})
export class AppModule {}
