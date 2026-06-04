import pino from "pino";
import { getMessage } from "../both/index.ts";

const isProduction = process.env.NODE_ENV === "production";

const logger = isProduction
  ? null
  : pino({
      formatters: {
        level(label) {
          return { level: label };
        },
      },
      timestamp: pino.stdTimeFunctions.isoTime,
      transport: !isProduction
        ? {
            target: "pino-pretty",
            options: {
              colorize: true,
              translateTime: "HH:MM:ss",
              ignore: "pid,hostname",
            },
          }
        : undefined,
    });

export class Logger {
  static log(...args: unknown[]): void {
    if (isProduction) return;
    logger?.info(getMessage(...args));
  }

  static warn(...args: unknown[]): void {
    if (isProduction) return;
    logger?.warn(getMessage(...args));
  }

  static error(...args: unknown[]): void {
    if (isProduction) return;
    logger?.error(getMessage(...args));
  }
}
