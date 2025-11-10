import { IsString, IsNotEmpty } from 'class-validator';

export class AssignTeacherDto {
  @IsString()
  @IsNotEmpty()
  teacherId: string;
}

