import {
  IsArray,
  IsString,
  IsOptional,
  IsNotEmpty,
  IsUUID,
} from 'class-validator';

export class CreateSubmissionDto {
  @IsUUID()
  @IsNotEmpty()
  homeworkId: string;

  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  fileUrls?: string[];
}
