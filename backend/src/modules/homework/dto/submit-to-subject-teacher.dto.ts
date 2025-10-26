import {
  IsString,
  IsOptional,
  IsNotEmpty,
  IsUUID,
} from 'class-validator';

export class SubmitToSubjectTeacherDto {
  @IsUUID()
  @IsNotEmpty()
  subjectId: string;

  @IsUUID()
  @IsOptional()
  teacherId?: string;

  @IsString()
  @IsNotEmpty()
  title: string;

  @IsString()
  @IsNotEmpty()
  description: string;
}
