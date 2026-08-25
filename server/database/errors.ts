import { Prisma } from "@/generated/prisma/index.js";
import { STATUS_RESPONSE } from "@common";

const PRISMA_CONFLICT_CODES = new Set(["P2002", "P2003", "P2014", "P2025"]);

const PRISMA_TRANSIENT_CODES = new Set(["P2010", "P2024", "P2028", "P2034"]);

export class ConflictError extends Error {
  readonly statusCode = STATUS_RESPONSE.CONFLICT;

  constructor(message: string, options?: ErrorOptions) {
    super(message, options);
    this.name = "ConflictError";
  }
}

export class TransientDatabaseError extends Error {
  readonly statusCode = STATUS_RESPONSE.SERVICE_UNAVAILABLE;

  constructor(message: string, options?: ErrorOptions) {
    super(message, options);
    this.name = "TransientDatabaseError";
  }
}

/**
 * Determines whether a Prisma error represents a data constraint conflict.
 */
export const isPrismaConflict = (error: unknown): boolean => {
  if (error instanceof Prisma.PrismaClientKnownRequestError)
    return PRISMA_CONFLICT_CODES.has(error.code);

  return false;
};

/**
 * Determines whether a Prisma error represents a transient database issue.
 */
export const isPrismaTransient = (error: unknown): boolean => {
  if (error instanceof Prisma.PrismaClientKnownRequestError)
    return PRISMA_TRANSIENT_CODES.has(error.code);

  if (
    error instanceof Prisma.PrismaClientInitializationError ||
    error instanceof Prisma.PrismaClientUnknownRequestError
  )
    return true;

  return false;
};
