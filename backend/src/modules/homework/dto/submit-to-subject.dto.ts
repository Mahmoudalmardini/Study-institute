import { IsString, IsNotEmpty, IsOptional, IsUUID } from 'class-validator';

export class SubmitToSubjectDto {
  @IsUUID()
  @IsNotEmpty()
  subjectId: string;

  @IsString()
  @IsNotEmpty()
  title: string;

  @IsString()
  @IsOptional()
  description?: string;
}

