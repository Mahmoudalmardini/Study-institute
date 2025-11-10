import { IsArray, IsString, ArrayNotEmpty } from 'class-validator';

export class AssignSubjectsDto {
  @IsArray()
  @ArrayNotEmpty()
  @IsString({ each: true })
  subjectIds: string[];
}

