import chalk from "chalk";
import { LoggerInterceptor } from "@types";
import { Helper } from "../both/helpers/index.ts";
import { REPLACERS } from "../both/REPLACERS/REPLACERS.server.ts";

const interceptors: LoggerInterceptor[] = [];

/**
 * Returns formatted timestamp in [HH:MM:ss] format.
 *
 * @returns Formatted timestamp string.
 */
const getTimestamp = (): string => {
  const now = new Date();
  const hours = String(now.getHours()).padStart(2, "0");
  const minutes = String(now.getMinutes()).padStart(2, "0");
  const seconds = String(now.getSeconds()).padStart(2, "0");
  return `[${hours}:${minutes}:${seconds}]`;
};

/**
 * Logger class for server, scripts, and Electron runtimes.
 */
export class Logger {
  /**
   * Adds an interceptor callback to inspect or suppress log messages.
   *
   * @param interceptor - The interceptor callback function.
   */
  static addInterceptor(interceptor: LoggerInterceptor): void {
    interceptors.push(interceptor);
  }

  /**
   * Logs an informational message with timestamp and level prefix.
   *
   * @param args - The arguments to log.
   */
  static log(...args: unknown[]): void {
    if (REPLACERS.isProduction) return;
    const msg = Helper.getMessage(...args);
    let skip = false;
    for (const interceptor of interceptors) {
      if (interceptor("log", msg)) skip = true;
    }
    if (!skip) {
      // eslint-disable-next-line no-console
      console.log(
        chalk.gray(getTimestamp()),
        chalk.green.bold("INFO") + ":",
        msg,
      );
    }
  }

  /**
   * Logs a warning message with timestamp and level prefix.
   *
   * @param args - The arguments to log.
   */
  static warn(...args: unknown[]): void {
    if (REPLACERS.isProduction) return;
    const msg = Helper.getMessage(...args);
    let skip = false;
    for (const interceptor of interceptors) {
      if (interceptor("warn", msg)) skip = true;
    }
    if (!skip) {
      // eslint-disable-next-line no-console
      console.warn(
        chalk.gray(getTimestamp()),
        chalk.yellow.bold("WARN") + ":",
        msg,
      );
    }
  }

  /**
   * Logs an error message with timestamp and level prefix.
   *
   * @param args - The arguments to log.
   */
  static error(...args: unknown[]): void {
    if (REPLACERS.isProduction) return;
    const msg = Helper.getMessage(...args);
    let skip = false;
    for (const interceptor of interceptors) {
      if (interceptor("error", msg)) skip = true;
    }
    if (!skip) {
      // eslint-disable-next-line no-console
      console.error(
        chalk.gray(getTimestamp()),
        chalk.red.bold("ERROR") + ":",
        msg,
      );
    }
  }
}

if (!REPLACERS.isProduction) {
  REPLACERS["Logger"] = Logger;
}
