import { IsString, IsEmail, IsOptional, IsUUID } from 'class-validator';

export class UpdateStudentDto {
  @IsEmail()
  @IsOptional()
  parentEmail?: string;

  @IsString()
  @IsOptional()
  parentPhone?: string;

  @IsUUID()
  @IsOptional()
  classId?: string;
}
