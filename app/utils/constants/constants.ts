import Constants from "expo-constants";
import { logError } from "../functions";

const checkVariables = (): void => {
  const NEEDED_VARIABLES = [
    "version",
    "WS_URL_BASE",
    "API_URL_BASE",
    "ADMIN_PASSWORD",
  ];
  for (const variable of NEEDED_VARIABLES) {
    if (
      !Constants.expoConfig?.extra ||
      !(variable in Constants.expoConfig.extra)
    ) {
      logError?.(`Missing required environment variable: ${variable}`);
    }
  }
};
checkVariables();

export const WS_URL_BASE = Constants.expoConfig?.extra?.WS_URL_BASE as string;
export const APP_VERSION = Constants.expoConfig?.extra?.version as string;
export const API_URL_BASE = Constants.expoConfig?.extra?.API_URL_BASE as string;
export const ADMIN_PASSWORD = Constants.expoConfig?.extra
  ?.ADMIN_PASSWORD as string;

export const isDev: boolean = process.env.NODE_ENV === "development";
export const isPreview: boolean = process.env.NODE_ENV === "preview";
export const isProduction: boolean = process.env.NODE_ENV === "production";
