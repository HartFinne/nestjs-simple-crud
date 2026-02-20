import { CallHandler, ExecutionContext, Injectable, NestInterceptor } from "@nestjs/common";
import { Observable } from "rxjs";
import { map } from "rxjs/operators";

export interface ApiResponse<T> {
  success: boolean;
  data: T;
  timestamp: string;
}

/**
 * TransformInterceptor
 * ---------------------
 * Wraps every successful response in a consistent API envelope:
 * {success: true, data: <payload>, timestamp: <iso>}
 */

@Injectable()
export class TransformInterceptor implements NestInterceptor {
  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    return next.handle().pipe(
      map((payload) => {
        const timestamp = new Date().toISOString();

        // Paginated payload — spread flat so meta sits alongside data
        if (this.isPaginated(payload)) {
          return { success: true, ...payload, timestamp };
        }

        // Regular payload — nest under data
        return { success: true, data: payload, timestamp };
      }),
    );
  }

  private isPaginated(payload: unknown): payload is { data: unknown[]; meta: object } {
    return (
      typeof payload === 'object' &&
      payload !== null &&
      'data' in payload &&
      'meta' in payload &&
      Array.isArray((payload as any).data)
    );
  }
}