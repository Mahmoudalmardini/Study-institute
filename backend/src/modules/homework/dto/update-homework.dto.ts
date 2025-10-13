import { IsString, IsDateString, IsArray, IsOptional } from 'class-validator';

export class UpdateHomeworkDto {
  @IsString()
  @IsOptional()
  title?: string;

  @IsString()
  @IsOptional()
  description?: string;

  @IsDateString()
  @IsOptional()
  dueDate?: string;

  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  fileUrls?: string[];
}
