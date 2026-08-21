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

type LoggerInterceptor = (
  type: "log" | "warn" | "error",
  message: string,
) => boolean;
const interceptors: LoggerInterceptor[] = [];

export class Logger {
  static addInterceptor(interceptor: LoggerInterceptor) {
    interceptors.push(interceptor);
  }

  static log(...args: unknown[]): void {
    if (REPLACERS.isProduction) return;
    const msg = Helper.getMessage(...args);
    let skip = false;
    for (const interceptor of interceptors) {
      if (interceptor("log", msg)) skip = true;
    }
    if (!skip) logger?.info(msg);
  }

  static warn(...args: unknown[]): void {
    if (REPLACERS.isProduction) return;
    const msg = Helper.getMessage(...args);
    let skip = false;
    for (const interceptor of interceptors) {
      if (interceptor("warn", msg)) skip = true;
    }
    if (!skip) logger?.warn(msg);
  }

  static error(...args: unknown[]): void {
    if (REPLACERS.isProduction) return;
    const msg = Helper.getMessage(...args);
    let skip = false;
    for (const interceptor of interceptors) {
      if (interceptor("error", msg)) skip = true;
    }
    if (!skip) logger?.error(msg);
  }
}

if (!REPLACERS.isProduction) {
  REPLACERS["Logger"] = Logger;
}
