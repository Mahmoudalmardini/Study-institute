import { IsInt, Min, Max } from 'class-validator';
import { Type } from 'class-transformer';

export class SubmitHourRequestDto {
  @IsInt()
  @Min(0)
  @Max(24)
  @Type(() => Number)
  hours: number;

  @IsInt()
  @Min(0)
  @Max(59)
  @Type(() => Number)
  minutes: number;
}

