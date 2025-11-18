import { IsArray, IsString, IsNumber, IsOptional, ArrayNotEmpty, Min, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';

class SubjectAssignmentDto {
  @IsString()
  subjectId: string;

  @IsNumber()
  @IsOptional()
  @Min(0)
  @Type(() => Number)
  monthlyInstallment?: number;
}

export class AssignSubjectsDto {
  @IsArray()
  @ArrayNotEmpty()
  @ValidateNested({ each: true })
  @Type(() => SubjectAssignmentDto)
  subjects: SubjectAssignmentDto[];
}

