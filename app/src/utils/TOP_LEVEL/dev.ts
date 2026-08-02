import Constants from "expo-constants";
import { REPLACERS } from "@common";

const checkVariables = (): void => {
  const NEEDED_VARIABLES = ["version", "WS_URL_BASE", "API_URL_BASE"];
  for (const variable of NEEDED_VARIABLES) {
    if (
      !Constants.expoConfig?.extra ||
      !(variable in Constants.expoConfig.extra)
    ) {
      throw new Error(`Missing required environment variable: ${variable}`);
    }
  }
};

if (REPLACERS.isDev) {
  checkVariables();
  // eslint-disable-next-line no-console
  console.log(`
      --------------------------------
      App Constants:
      APP_VERSION: ${Constants.expoConfig?.extra?.version}
      WS_URL_BASE: ${Constants.expoConfig?.extra?.WS_URL_BASE}
      API_URL_BASE: ${Constants.expoConfig?.extra?.API_URL_BASE}
      REPLACERS: ${JSON.stringify(REPLACERS, null, 2)}
      --------------------------------`);
}
