import { IsNumber, IsString, Min, Max, IsOptional } from 'class-validator';

export class UpdateGradeDto {
  @IsNumber()
  @Min(0)
  @Max(100)
  @IsOptional()
  grade?: number;

  @IsString()
  @IsOptional()
  term?: string;

  @IsString()
  @IsOptional()
  academicYear?: string;

  @IsString()
  @IsOptional()
  notes?: string;
}
