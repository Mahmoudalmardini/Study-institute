import { IsNumber, IsOptional, Min } from 'class-validator';
import { Type } from 'class-transformer';

export class UpdateClassSubjectInstallmentDto {
  @IsNumber()
  @IsOptional()
  @Min(0)
  @Type(() => Number)
  monthlyInstallment?: number;
}

