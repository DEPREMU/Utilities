import { Logger } from "@common";
import { prisma } from "./postgres.ts";
import {
  ConflictError,
  TransientDatabaseError,
  isPrismaConflict,
  isPrismaTransient,
} from "./errors.ts";
import type { PrismaClient } from "@/generated/prisma/index.js";

type TransactionClient = Parameters<
  Parameters<PrismaClient["$transaction"]>[0]
>[0];

/**
 * Executes the provided callback inside a Prisma interactive transaction.
 *
 * If an error occurs inside the callback, the transaction is automatically
 * rolled back by Prisma. The error is then classified:
 *  - Constraint violations → ConflictError (409)
 *  - Transient / connectivity issues → TransientDatabaseError (503)
 *  - Already-typed domain errors (ConflictError, TransientDatabaseError)
 *    are re-thrown as-is.
 *  - Everything else is re-thrown unchanged so that the outer handler
 *    can produce a generic 500.
 */
export const withTransaction = async <T>(
  fn: (tx: TransactionClient) => Promise<T>,
): Promise<T> => {
  try {
    return await prisma.$transaction(fn);
  } catch (error) {
    if (
      error instanceof ConflictError ||
      error instanceof TransientDatabaseError
    )
      throw error;

    if (isPrismaConflict(error)) {
      throw new ConflictError(
        "Data constraint violation prevented the transaction from completing.",
        { cause: error },
      );
    }

    if (isPrismaTransient(error)) {
      Logger.error("Transient database error during transaction:", error);
      throw new TransientDatabaseError(
        "Transient database error occurred. Please try again later.",
        { cause: error },
      );
    }

    throw error;
  }
};
