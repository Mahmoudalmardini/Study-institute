import { IsNumber, IsNotEmpty, Min, Max } from 'class-validator';
import { Type } from 'class-transformer';

export class CalculateInstallmentDto {
  @IsNumber()
  @IsNotEmpty()
  @Min(1)
  @Max(12)
  @Type(() => Number)
  month: number;

  @IsNumber()
  @IsNotEmpty()
  @Min(2000)
  @Type(() => Number)
  year: number;
}

