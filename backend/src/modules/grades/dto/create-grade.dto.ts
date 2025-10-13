import {
  IsNotEmpty,
  IsNumber,
  IsString,
  IsUUID,
  Min,
  Max,
  IsOptional,
} from 'class-validator';

export class CreateGradeDto {
  @IsUUID()
  @IsNotEmpty()
  studentId: string;

  @IsUUID()
  @IsNotEmpty()
  subjectId: string;

  @IsNumber()
  @Min(0)
  @Max(100)
  @IsNotEmpty()
  grade: number;

  @IsString()
  @IsNotEmpty()
  term: string;

  @IsString()
  @IsNotEmpty()
  academicYear: string;

  @IsString()
  @IsOptional()
  notes?: string;
}
