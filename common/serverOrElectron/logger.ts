import pino from "pino";
import { REPLACERS, Helper } from "@commonSrc/both/";

const logger = REPLACERS.isProduction
  ? null
  : pino({
      timestamp: pino.stdTimeFunctions.isoTime,
      formatters: { level: (level) => ({ level }) },
      transport: {
        target: "pino-pretty",
        options: {
          ignore: "pid,hostname",
          colorize: true,
          translateTime: "HH:MM:ss",
        },
      },
    });

export class Logger {
  static log(...args: unknown[]): void {
    if (REPLACERS.isProduction) return;
    logger?.info(Helper.getMessage(...args));
  }

  static warn(...args: unknown[]): void {
    if (REPLACERS.isProduction) return;
    logger?.warn(Helper.getMessage(...args));
  }

  static error(...args: unknown[]): void {
    if (REPLACERS.isProduction) return;
    logger?.error(Helper.getMessage(...args));
  }
}
