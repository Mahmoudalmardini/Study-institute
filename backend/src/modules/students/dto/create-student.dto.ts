import {
  IsNotEmpty,
  IsString,
  IsEmail,
  IsOptional,
  IsUUID,
} from 'class-validator';

export class CreateStudentDto {
  @IsUUID()
  @IsNotEmpty()
  userId: string;

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
