import { BadRequestException, InternalServerErrorException, Logger, NotFoundException } from "@nestjs/common";


/**
   * Wraps every Firestore call. Re-throws known HTTP exceptions as-is,
   * and maps unknown errors to 500 so no raw Firestore errors leak to the client.
   */
export abstract class BaseRepository {
  protected abstract logger: Logger;

  protected async run<T>(context: string, fn: () => Promise<T>): Promise<T> {
    try {
      return await fn();
    } catch (err) {
      if (err instanceof NotFoundException || err instanceof BadRequestException) {
        throw err;
      }
      this.logger.error(context, err);
      throw new InternalServerErrorException(context);
    }
  }
}