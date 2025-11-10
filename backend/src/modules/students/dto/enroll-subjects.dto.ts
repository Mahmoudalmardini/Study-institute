import { IsArray, IsUUID, ArrayMinSize, ValidateNested, IsOptional } from 'class-validator';
import { Type } from 'class-transformer';

class SubjectEnrollmentDto {
  @IsUUID('4')
  subjectId: string;

  @IsUUID('4')
  @IsOptional()
  teacherId?: string;
}

export class EnrollSubjectsDto {
  @IsArray()
  @ArrayMinSize(1, { message: 'At least one subject must be assigned' })
  @ValidateNested({ each: true })
  @Type(() => SubjectEnrollmentDto)
  subjects: SubjectEnrollmentDto[];
}

