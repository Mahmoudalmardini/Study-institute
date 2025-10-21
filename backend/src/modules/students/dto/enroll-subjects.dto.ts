import { IsArray, IsUUID } from 'class-validator';

export class EnrollSubjectsDto {
  @IsArray()
  @IsUUID('4', { each: true })
  subjectIds: string[];
}

