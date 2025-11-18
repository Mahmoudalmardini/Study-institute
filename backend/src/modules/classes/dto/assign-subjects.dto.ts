import { IsArray, IsString, IsNumber, ArrayNotEmpty, Min, ValidateNested, IsNotEmpty } from 'class-validator';
import { Type } from 'class-transformer';

class SubjectAssignmentDto {
  @IsString()
  @IsNotEmpty()
  subjectId: string;

  @IsNumber()
  @IsNotEmpty()
  @Min(0)
  @Type(() => Number)
  monthlyInstallment: number;
}

export class AssignSubjectsDto {
  @IsArray()
  @ArrayNotEmpty()
  @ValidateNested({ each: true })
  @Type(() => SubjectAssignmentDto)
  subjects: SubjectAssignmentDto[];
}

