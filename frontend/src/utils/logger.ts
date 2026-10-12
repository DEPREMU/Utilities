/* eslint-disable no-console */
import { Logger } from "@types";
import { Helper } from "@common";
import { REPLACERS } from "@REPLACERS";

/**
 * Logs a message to the console or sends it to a server.
 *
 * @param args - The error message and additional data to log.
 *
 * @remarks
 * - In development mode, logs to the console.
 * - In preview mode, sends the log to a server endpoint.
 * - In production mode, does nothing.
 */
const log = (...args: unknown[]): void => {
  if (REPLACERS.isProduction) return;

  const date = new Date();

  const firstMessage = `Info - ${date.toLocaleString()} ::\n`;
  const message = Helper.getMessage(...args);
  const cleanMessage = Helper.stripAnsi(message);

  if (REPLACERS.isWeb) {
    console.log(
      `%c${firstMessage}`,
      "color: #3b82f6; font-weight: bold;",
      cleanMessage,
    );
  } else {
    console.log(firstMessage, cleanMessage);
  }
};

/**
 * Logs warning messages based on the current environment.
 *
 * In development mode, logs to console using console.warn.
 * In preview mode, sends the warning message to a remote logging API endpoint.
 * In production mode (non-preview), the function returns early without logging.
 *
 * @param args - Variable number of arguments of any type to be logged as warning messages
 * @returns A Promise that resolves when the logging operation is complete
 *
 * @example
 * ```typescript
 * REPLACERS.Logger.logWarn("User validation failed", { userId: 123, error: "Invalid email" });
 * REPLACERS.Logger.logWarn("API rate limit exceeded");
 * ```
 */
const warn = async (...args: unknown[]): Promise<void> => {
  if (REPLACERS.isProduction) return;

  const date = new Date();

  const firstMessage = `Warning - ${date.toLocaleString()} ::\n`;
  const message = Helper.getMessage(...args);
  const cleanMessage = Helper.stripAnsi(message);

  if (REPLACERS.isWeb) {
    console.warn(
      `%c${firstMessage}`,
      "color: #eab308; font-weight: bold;",
      cleanMessage,
    );
  } else {
    console.warn(firstMessage, cleanMessage);
  }
};

/**
 * Logs an error message to the console or sends it to a server.
 *
 * @param args - The error message and additional data to log.
 *
 * @remarks
 * - In development mode, logs to the console.
 * - In preview mode, sends the log to a server endpoint.
 * - In production mode, does nothing.
 */
const error = async (...args: unknown[]): Promise<void> => {
  if (REPLACERS.isProduction) return;

  const date = new Date();
  const firstMessage = `Error - ${date.toLocaleString()} ::\n`;
  const message = Helper.getMessage(...args);
  const cleanMessage = Helper.stripAnsi(message);

  if (REPLACERS.isWeb) {
    console.error(
      `%c${firstMessage}`,
      "color: #ef4444; font-weight: bold;",
      cleanMessage,
    );
  } else {
    console.error(firstMessage, cleanMessage);
  }
};

const fun = () => {};

export const logger: Logger = !REPLACERS.isProduction
  ? { log, warn, error, secret: () => "" }
  : { log: fun, warn: fun, error: fun, secret: () => "" };
