import {
  IsNotEmpty,
  IsNumber,
  IsString,
  IsUUID,
  Min,
  Max,
  IsOptional,
} from 'class-validator';

export class CreateEvaluationDto {
  @IsUUID()
  @IsNotEmpty()
  studentId: string;

  @IsString()
  @IsNotEmpty()
  term: string;

  @IsString()
  @IsNotEmpty()
  academicYear: string;

  @IsNumber()
  @Min(0)
  @Max(100)
  @IsNotEmpty()
  behaviorScore: number;

  @IsNumber()
  @Min(0)
  @Max(100)
  @IsNotEmpty()
  performanceScore: number;

  @IsString()
  @IsOptional()
  comments?: string;
}
