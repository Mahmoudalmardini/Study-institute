import { IsString, IsNotEmpty, IsOptional } from 'class-validator';

export class AssignTeacherDto {
  @IsString()
  @IsNotEmpty()
  teacherId: string;

  @IsString()
  @IsNotEmpty()
  classId: string;
}

