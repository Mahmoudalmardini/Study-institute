import { IsNumber, IsOptional, Min } from 'class-validator';
import { Type } from 'class-transformer';

export class UpdateInstallmentDto {
  @IsNumber()
  @IsOptional()
  @Min(0)
  @Type(() => Number)
  totalAmount?: number;

  @IsNumber()
  @IsOptional()
  @Min(0)
  @Type(() => Number)
  paidAmount?: number;

  @IsNumber()
  @IsOptional()
  @Min(0)
  @Type(() => Number)
  discountAmount?: number;
}

