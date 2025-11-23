import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';

export interface Response<T> {
  data: T;
  statusCode: number;
  message?: string;
}

@Injectable()
export class TransformInterceptor<T>
  implements NestInterceptor<T, Response<T>>
{
  intercept(
    context: ExecutionContext,
    next: CallHandler,
  ): Observable<Response<T>> {
    return next.handle().pipe(
      map((data) => {
        // Check if response is already a pagination response (has data and meta properties)
        if (
          data &&
          typeof data === 'object' &&
          'data' in data &&
          'meta' in data &&
          Array.isArray(data.data) &&
          data.meta &&
          typeof data.meta === 'object' &&
          'page' in data.meta &&
          'limit' in data.meta &&
          'total' in data.meta &&
          'totalPages' in data.meta
        ) {
          // Return pagination response as-is without wrapping
          return {
            statusCode: context.switchToHttp().getResponse().statusCode,
            ...data,
          } as any;
        }
        // For non-pagination responses, wrap in standard format
        return {
          statusCode: context.switchToHttp().getResponse().statusCode,
          data,
        };
      }),
    );
  }
}
