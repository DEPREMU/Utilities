import { Logs } from "@types";
import { insertIntoTable } from "../supabase";
import { getCurrentUserId } from "./storageManagement";

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
export const log = async (...args: unknown[]): Promise<void> => {
  const env = process.env.NODE_ENV;
  const isDev = env === "development" || __DEV__;
  const isPreview = env === "preview";
  const isProduction = env === "production";
  if (isProduction || (!isPreview && !isDev)) return;

  const date = new Date();

  const firstMessage = `Log - ${date.toLocaleString()} ::\n`;

  if (isDev) console.log(firstMessage, ...args);
  else if (isPreview) {
    const message = [firstMessage, ...args]
      .filter(Boolean)
      .map((arg) =>
        typeof arg === "object" ? JSON.stringify(arg, null, 2) : arg,
      )
      .join(" ");
    const userId = await getCurrentUserId();

    await insertIntoTable<Logs>("Logs", {
      message,
      timestamp: date.toISOString(),
      type: "log",
      userId,
    });
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
 * await logWarn("User validation failed", { userId: 123, error: "Invalid email" });
 * await logWarn("API rate limit exceeded");
 * ```
 */
export const logWarn = async (...args: unknown[]): Promise<void> => {
  const env = process.env.NODE_ENV;
  const isDev = env === "development" || __DEV__;
  const isPreview = env === "preview";
  const isProduction = env === "production";

  if (isProduction && !isPreview && !isDev) return;

  const date = new Date();

  const firstMessage = `Warning - ${date.toLocaleString()} ::\n`;

  if (isDev) console.warn(firstMessage, ...args);
  else if (isPreview) {
    const warningMessage = [firstMessage, ...args]
      .filter(Boolean)
      .map((arg) =>
        typeof arg === "object" ? JSON.stringify(arg, null, 2) : arg,
      )
      .join(" ");

    const userId = await getCurrentUserId();

    await insertIntoTable<Logs>("Logs", {
      message: warningMessage,
      timestamp: date.toISOString(),
      type: "warn",
      userId,
    });
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
export const logError = async (...args: unknown[]): Promise<void> => {
  const env = process.env.NODE_ENV;
  const isDev = env === "development" || __DEV__;
  const isPreview = env === "preview";
  const isProduction = env === "production";

  if (isProduction && !isPreview && !isDev) return;

  const date = new Date();

  const firstMessage = `Error - ${date.toLocaleString()} ::\n`;

  if (isDev) console.error(firstMessage, ...args);
  else if (isPreview) {
    const errorMessage = [firstMessage, ...args]
      .filter(Boolean)
      .map((arg) =>
        typeof arg === "object" ? JSON.stringify(arg, null, 2) : arg,
      )
      .join(" ");
    const userId = await getCurrentUserId();

    await insertIntoTable<Logs>("Logs", {
      message: errorMessage,
      timestamp: date.toISOString(),
      type: "error",
      userId,
    });
  }
};

/**
 * Retrieves the file name of the caller function from the stack trace.
 *
 * @returns The file name as a string if it can be determined, otherwise "unknown".
 *
 * @remarks
 * This function uses the `Error` stack trace to extract the file name of the caller.
 * It parses the stack trace and attempts to match the file name using a regular expression.
 * Note that the accuracy of this function depends on the structure of the stack trace,
 * which may vary between environments (e.g., browsers, Node.js).
 *
 * @example
 * ```typescript
 * const fileName = getFileName();
 * log(fileName); // Outputs the file name of the caller or "unknown".
 * ```
 */
export const getFileName = (): string => {
  const stack = new Error().stack;
  if (stack) {
    const fileName = stack.split("\n")[2].trim();
    const fileNameMatch = fileName.match(/at (.+):\d+:\d+/);
    if (fileNameMatch) {
      return fileNameMatch[1];
    }
  }
  return "unknown";
};

/**
 * Retrieves the line number of the code that called this function.
 *
 * This function uses the stack trace of a newly created `Error` object
 * to determine the line number of the caller. If the stack trace is not
 * available or the line number cannot be determined, it returns `-1`.
 *
 * @returns The line number of the caller, or `-1` if it cannot be determined.
 */
export const getLineNumber = (): number => {
  const stack = new Error().stack;
  if (stack) {
    const lineNumber = stack.split("\n")[2].trim();
    const lineNumberMatch = lineNumber.match(/:(\d+):/);
    if (lineNumberMatch) {
      return parseInt(lineNumberMatch[1], 10);
    }
  }
  return -1;
};
