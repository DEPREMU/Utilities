import { Helper } from "@common";
import { REPLACERS } from "@REPLACERS";

export * from "./t";

const sanitize = (message: unknown): unknown => {
  return typeof message === "string" ? Helper.stripAnsi(message) : message;
};

if (REPLACERS.isDev) {
  REPLACERS.Logger = {
    log(...args: unknown[]) {
      // eslint-disable-next-line no-console
      console.log(...args.map(sanitize));
    },
    warn(...args: unknown[]) {
      // eslint-disable-next-line no-console
      console.warn(...args.map(sanitize));
    },
    error(...args: unknown[]) {
      // eslint-disable-next-line no-console
      console.error(...args.map(sanitize));
    },
  };
}
