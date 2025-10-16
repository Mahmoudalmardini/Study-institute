import { IsEnum, IsString, IsNotEmpty } from 'class-validator';
import { EvaluationStatus } from '@prisma/client';

export class TeacherEvaluateSubmissionDto {
  @IsEnum(EvaluationStatus)
  evaluation: EvaluationStatus;

  @IsString()
  @IsNotEmpty()
  feedback: string;
}

