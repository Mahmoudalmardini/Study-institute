import { IsArray, IsUUID, ArrayMinSize } from 'class-validator';

export class EnrollSubjectsDto {
  @IsArray()
  @ArrayMinSize(1, { message: 'At least one subject must be assigned' })
  @IsUUID('4', { each: true })
  subjectIds: string[];
}

