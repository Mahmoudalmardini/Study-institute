import { IsNumber, IsString, Min, Max, IsOptional } from 'class-validator';

export class UpdateEvaluationDto {
  @IsString()
  @IsOptional()
  term?: string;

  @IsString()
  @IsOptional()
  academicYear?: string;

  @IsNumber()
  @Min(0)
  @Max(100)
  @IsOptional()
  behaviorScore?: number;

  @IsNumber()
  @Min(0)
  @Max(100)
  @IsOptional()
  performanceScore?: number;

  @IsString()
  @IsOptional()
  comments?: string;
}
