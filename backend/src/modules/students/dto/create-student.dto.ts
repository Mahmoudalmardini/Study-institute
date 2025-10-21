import {
  IsNotEmpty,
  IsString,
  IsEmail,
  IsOptional,
  IsUUID,
  IsArray,
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

  @IsArray()
  @IsUUID('4', { each: true })
  @IsOptional()
  subjectIds?: string[];
}
