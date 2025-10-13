import {
  IsNotEmpty,
  IsString,
  IsUUID,
  IsDateString,
  IsArray,
  IsOptional,
} from 'class-validator';

export class CreateHomeworkDto {
  @IsString()
  @IsNotEmpty()
  title: string;

  @IsString()
  @IsNotEmpty()
  description: string;

  @IsDateString()
  @IsNotEmpty()
  dueDate: string;

  @IsUUID()
  @IsNotEmpty()
  classId: string;

  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  fileUrls?: string[];
}
