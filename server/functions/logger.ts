import pino from "pino";

const logger = pino({
  formatters: {
    level(label) {
      return { level: label };
    },
  },
  timestamp: pino.stdTimeFunctions.isoTime,
});

const JOINER = " | ";

export const showInfo = (...args: unknown[]): void => {
  logger.info(args.map(String).join(JOINER));
};

export const showWarn = (...args: unknown[]): void => {
  logger.warn(args.map(String).join(JOINER));
};

export const showError = (...args: unknown[]): void => {
  logger.error(args.map(String).join(JOINER));
};
