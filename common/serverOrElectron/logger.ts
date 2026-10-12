import pino from "pino";
import chalk from "chalk";
import { Helper } from "@commonSrc/both/helpers";
import { REPLACERS } from "@REPLACERS";
import type { ILogger, LoggerInterceptor } from "@types";

const interceptors: LoggerInterceptor[] = [];

const logger = pino({
  timestamp: pino.stdTimeFunctions.isoTime,
  formatters: { level: (level) => ({ level }) },
  transport: REPLACERS.isProduction
    ? undefined
    : {
        target: "pino-pretty",
        options: {
          ignore: "pid,hostname",
          colorize: true,
          translateTime: "HH:MM:ss",
        },
      },
});

/**
 * Module-scoped logger for backend server components.
 */
export class Logger implements ILogger {
  #moduleName: string;

  /**
   * Formats the log message into a bracketed string.
   *
   * @param level - Log severity level.
   * @param args - Log arguments.
   * @returns Formatted log message string.
   */
  protected getLogMsg(
    level: "log" | "warn" | "error",
    ...args: unknown[]
  ): string {
    const msg = Helper.getMessage(...args);
    return `[${this.#moduleName}]-[${level.toUpperCase()}]: ${msg}`;
  }

  /**
   * Formats the log message with ANSI color highlighting for console streams.
   *
   * @param level - Log severity level.
   * @param args - Log arguments.
   * @returns Color-highlighted log message string.
   */
  protected getColoredLogMsg(
    level: "log" | "warn" | "error",
    ...args: unknown[]
  ): string {
    const moduleTag = chalk.cyan(`[${this.#moduleName}]`);
    const levelTag =
      level === "error"
        ? chalk.red.bold("[ERROR]")
        : level === "warn"
          ? chalk.yellow.bold("[WARN]")
          : chalk.green.bold("[LOG]");
    const msg = Helper.getMessage(...args);
    const cleanedMsg = Helper.stripAnsi(`${moduleTag}-${levelTag}: ${msg}`);
    return cleanedMsg;
  }

  /**
   * Writes the log message to console streams after running interceptors.
   *
   * @param level - Log severity level.
   * @param args - Log arguments.
   */
  protected writeLog(
    level: "log" | "warn" | "error",
    ...args: unknown[]
  ): void {
    const rawMsg = this.getLogMsg(level, ...args);
    let skip = false;
    for (const interceptor of interceptors) {
      if (interceptor(level, rawMsg)) {
        skip = true;
      }
    }
    if (!skip) {
      const msg = this.getColoredLogMsg(level, ...args);

      switch (level) {
        case "log":
          logger.info(msg);
          break;
        case "warn":
          logger.warn(msg);
          break;
        case "error":
          logger.error(msg);
          break;
      }
    }
  }

  public secret: (value: unknown) => string = Helper.secret;

  /**
   * Logs an informational message with timestamp and module prefix.
   *
   * @param args - Arguments to log.
   */
  public log(...args: unknown[]): void {
    this.writeLog("log", ...args);
  }

  /**
   * Logs a warning message with timestamp and module prefix.
   *
   * @param args - Arguments to log.
   */
  public warn(...args: unknown[]): void {
    this.writeLog("warn", ...args);
  }

  /**
   * Logs an error message with timestamp and module prefix.
   *
   * @param args - Arguments to log.
   */
  public error(...args: unknown[]): void {
    this.writeLog("error", ...args);
  }

  /**
   * Adds an interceptor callback to inspect or suppress log messages.
   *
   * @param interceptor - The interceptor callback function.
   */
  static addInterceptor(interceptor: LoggerInterceptor): void {
    interceptors.push(interceptor);
  }

  /**
   * Creates a new module-scoped Logger instance.
   *
   * @param moduleName - Name of the module or component.
   */
  constructor(moduleName: string) {
    this.#moduleName = moduleName;
  }
}
