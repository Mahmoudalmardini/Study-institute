import { IsEnum, IsString, IsNotEmpty } from 'class-validator';
import { EvaluationStatus } from '@prisma/client';

export class AdminReviewSubmissionDto {
  @IsEnum(EvaluationStatus)
  evaluation: EvaluationStatus;

  @IsString()
  @IsNotEmpty()
  feedback: string;
}

