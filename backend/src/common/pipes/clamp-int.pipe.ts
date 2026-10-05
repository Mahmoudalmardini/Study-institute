import { PipeTransform } from '@nestjs/common';

/**
 * Keeps a parsed integer in [min, max] instead of rejecting it:
 * missing or below `min` becomes `fallback`, above `max` becomes `max`.
 */
export class ClampIntPipe implements PipeTransform<number, number> {
  constructor(
    private readonly min: number,
    private readonly max: number,
    private readonly fallback: number = min,
  ) {}

  transform(value: number): number {
    if (!Number.isFinite(value) || value < this.min) return this.fallback;
    return Math.min(this.max, value);
  }
}
