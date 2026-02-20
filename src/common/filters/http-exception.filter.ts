import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { Request, Response } from 'express';

interface ErrorResponse {
  statusCode: number;
  message: string | string[];
  error: string;
  path: string;
  timestamp: string;
}

/**
 * HttpExceptionFilter
 * -------------------
 * Catches ALL exceptions and returns a consistent JSON error envelope.
 *
 * Logging strategy:
 *   - 4xx → warn  (client mistakes, expected, not actionable by devs)
 *   - 5xx → error (server faults, need immediate attention)
 *   - unknown → error (always unexpected)
 */
@Catch()
export class HttpExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(HttpExceptionFilter.name);

  catch(exception: unknown, host: ArgumentsHost): void {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();

    let status = HttpStatus.INTERNAL_SERVER_ERROR;
    let message: string | string[] = 'Internal server error';
    let error = 'Internal Server Error';

    if (exception instanceof HttpException) {
      status = exception.getStatus();
      const exResponse = exception.getResponse();

      if (typeof exResponse === 'string') {
        message = exResponse;
      } else if (typeof exResponse === 'object' && exResponse !== null) {
        const body = exResponse as Record<string, unknown>;
        message = (body['message'] as string | string[]) ?? message;
        error = (body['error'] as string) ?? exception.name;
      }
    } else {
      // Non-HTTP exceptions — always a server fault
      error = 'Internal Server Error';
      message = 'Internal server error';
    }

    const body: ErrorResponse = {
      statusCode: status,
      message,
      error,
      path: request.url,
      timestamp: new Date().toISOString(),
    };

    // ── Logging strategy ──────────────────────────────────────────────────
    const logContext = `${request.method} ${request.url}`;

    if (status >= 500) {
      // Server errors — log full stack trace for debugging
      this.logger.error(
        `[${status}] ${logContext} — ${JSON.stringify(message)}`,
        exception instanceof Error ? exception.stack : String(exception),
      );
    } else if (status >= 400) {
      // Client errors — warn level, no stack trace needed
      this.logger.warn(`[${status}] ${logContext} — ${JSON.stringify(message)}`);
    }

    response.status(status).json(body);
  }
}