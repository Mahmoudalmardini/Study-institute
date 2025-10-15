import { IsString, IsNotEmpty, IsUUID } from 'class-validator';

export class CreateStudentSubmissionDto {
  @IsString()
  @IsNotEmpty()
  title: string;

  @IsString()
  @IsNotEmpty()
  description: string;

  @IsUUID()
  @IsNotEmpty()
  teacherId: string; // Teacher profile ID
}

