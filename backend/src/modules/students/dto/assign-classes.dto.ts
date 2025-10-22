import { IsArray, IsUUID } from 'class-validator';

export class AssignClassesDto {
  @IsArray()
  @IsUUID('4', { each: true })
  classIds: string[];
}

