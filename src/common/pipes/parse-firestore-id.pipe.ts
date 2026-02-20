import {
  BadRequestException,
  Injectable,
  PipeTransform,
} from '@nestjs/common';

/**
 * ParseFirestoreIdPipe
 * --------------------
 * Validates that a route param looks like a valid Firestore document ID.
 * Firestore IDs: 1–128 chars, no forward slashes.
 */
@Injectable()
export class ParseFirestoreIdPipe implements PipeTransform<string, string> {
  private static readonly ID_REGEX = /^[^\s/]{1,128}$/;

  transform(value: string): string {
    if (!value || !ParseFirestoreIdPipe.ID_REGEX.test(value)) {
      throw new BadRequestException(
        `"${value}" is not a valid Firestore document ID`,
      );
    }
    return value;
  }
}
