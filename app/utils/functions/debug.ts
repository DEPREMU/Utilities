import { Logs } from "@types";
import { insertIntoTable, getCurrentUserId } from "../supabase";

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

  if (isDev)
    console.log(
      firstMessage,
      ...args.map((arg) =>
        typeof arg === "object" ? JSON.stringify(arg, null, 2) : arg,
      ),
    );
  else if (isPreview) {
    const message = [firstMessage, ...args]
      .filter(Boolean)
      .map((arg) =>
        typeof arg === "object" ? JSON.stringify(arg, null, 2) : arg,
      )
      .join(" ");
    const userId = await getCurrentUserId();

    insertIntoTable<Logs>("Logs", {
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

  if (isDev)
    console.error(
      firstMessage,
      ...args.map((arg) =>
        typeof arg === "object" ? JSON.stringify(arg, null, 2) : arg,
      ),
    );
  else if (isPreview) {
    const errorMessage = [firstMessage, ...args]
      .filter(Boolean)
      .map((arg) =>
        typeof arg === "object" ? JSON.stringify(arg, null, 2) : arg,
      )
      .join(" ");
    const userId = await getCurrentUserId();

    insertIntoTable<Logs>("Logs", {
      message: errorMessage,
      timestamp: date.toISOString(),
      type: "error",
      userId,
    });
  }
};
