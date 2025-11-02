import { IsNumber, IsOptional, Min } from 'class-validator';
import { Type } from 'class-transformer';

export class UpdateSalaryDto {
  @IsNumber()
  @IsOptional()
  @Min(0)
  @Type(() => Number)
  monthlySalary?: number;

  @IsNumber()
  @IsOptional()
  @Min(0)
  @Type(() => Number)
  hourlyWage?: number;
}

