import {
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { Response } from 'express';

// HttpStatus.UNAUTHORIZED -> "Unauthorized", HttpStatus.NOT_FOUND -> "Not Found"
function statusLabel(status: number): string {
  const name = HttpStatus[status];
  if (!name) return 'Error';
  return name
    .toLowerCase()
    .split('_')
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(' ');
}

@Catch()
export class AllExceptionsFilter implements ExceptionFilter {
  private readonly logger = new Logger(AllExceptionsFilter.name);

  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest();

    let status = HttpStatus.INTERNAL_SERVER_ERROR;
    let message = 'Internal server error';
    let error = 'Internal Server Error';

    if (exception instanceof HttpException) {
      status = exception.getStatus();
      // e.g. passport's 401 response has no `error` field; label it by its status
      error = statusLabel(status);
      const exceptionResponse = exception.getResponse();

      if (typeof exceptionResponse === 'string') {
        message = exceptionResponse;
      } else if (typeof exceptionResponse === 'object') {
        message = (exceptionResponse as any).message || message;
        error = (exceptionResponse as any).error || error;
      }
    } else if (exception instanceof Error) {
      message = exception.message;
      error = exception.name;

      // Log the full error for debugging
      this.logger.error(
        `Unhandled exception: ${exception.message}`,
        exception.stack,
      );
    }

    if (status >= 500) {
      this.logger.error(
        `HTTP ${status} Error - ${request.method} ${request.url}`,
        {
          status,
          error,
          message,
          path: request.url,
          method: request.method,
          timestamp: new Date().toISOString(),
          ...(exception instanceof Error ? { stack: exception.stack } : {}),
        },
      );
    } else {
      // Client errors (expired tokens, 404s, validation) are expected traffic, not failures
      const text = Array.isArray(message) ? message.join('; ') : message;
      this.logger.warn(`HTTP ${status} ${request.method} ${request.url} - ${text}`);
    }

    response.status(status).json({
      statusCode: status,
      error,
      message,
      timestamp: new Date().toISOString(),
      path: request.url,
    });
  }
}
