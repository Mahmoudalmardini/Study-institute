import { IsEnum, IsNumber, IsInt, IsString, IsOptional, Min, Max } from 'class-validator';
import { Type } from 'class-transformer';
import { HourRequestStatus } from '@prisma/client';

export class ReviewHourRequestDto {
  @IsEnum(HourRequestStatus)
  status: HourRequestStatus;

  @IsNumber()
  @IsOptional()
  @Min(0)
  @Max(24)
  @Type(() => Number)
  adminModifiedHours?: number;

  @IsInt()
  @IsOptional()
  @Min(0)
  @Max(59)
  @Type(() => Number)
  adminModifiedMinutes?: number;

  @IsString()
  @IsOptional()
  adminFeedback?: string;
}

