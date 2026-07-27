import pino from "pino";
import { Helper } from "../both/index.ts";

const isProduction = process.env.NODE_ENV === "production";

const logger = isProduction
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
    if (isProduction) return;
    logger?.info(Helper.getMessage(...args));
  }

  static warn(...args: unknown[]): void {
    if (isProduction) return;
    logger?.warn(Helper.getMessage(...args));
  }

  static error(...args: unknown[]): void {
    if (isProduction) return;
    logger?.error(Helper.getMessage(...args));
  }
}
