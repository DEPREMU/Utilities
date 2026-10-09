import { REPLACERS } from "@REPLACERS";

export * from "./t";

if (REPLACERS.isDev) {
  REPLACERS.Logger = {
    log(message: unknown) {
      // eslint-disable-next-line no-console
      console.log(message);
    },
    warn(message: unknown) {
      // eslint-disable-next-line no-console
      console.warn(message);
    },
    error(message: unknown) {
      // eslint-disable-next-line no-console
      console.error(message);
    },
  };
}
