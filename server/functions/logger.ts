import pino from "pino";

const logger = pino({
  formatters: {
    level(label) {
      return { level: label };
    },
  },
  timestamp: pino.stdTimeFunctions.isoTime,
  transport:
    process.env.NODE_ENV !== "production"
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

const JOINER = " | ";

const getMessage = (...args: unknown[]): string => {
  return args
    .map((arg) => {
      if (typeof arg === "object" && arg !== null) {
        try {
          return JSON.stringify(arg);
        } catch {
          return String(arg);
        }
      }
      return String(arg);
    })
    .join(JOINER);
};

export const showInfo = (...args: unknown[]): void => {
  logger.info(getMessage(...args));
};

export const showWarn = (...args: unknown[]): void => {
  logger.warn(getMessage(...args));
};

export const showError = (...args: unknown[]): void => {
  logger.error(getMessage(...args));
};
