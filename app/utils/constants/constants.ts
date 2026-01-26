import Constants from "expo-constants";
import { Platform } from "react-native";
import { REPLACERS_TYPE } from "@types";

const isDev: boolean = process.env.BUILD_PROFILE === "development";
const isWeb: boolean = Platform.OS === "web";
const isNative: boolean = !isWeb;
const isPreview: boolean = process.env.BUILD_PROFILE === "preview";
const isProduction: boolean = process.env.BUILD_PROFILE === "production";

export const REPLACERS: Record<REPLACERS_TYPE, boolean> = {
  isDev,
  isWeb,
  isNative,
  isPreview,
  isProduction,
};

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
  WS_URL_BASE: ${Constants.expoConfig?.extra?.WS_URL_BASE}
  API_URL_BASE: ${Constants.expoConfig?.extra?.API_URL_BASE}
  ADMIN_PASSWORD: ${Constants.expoConfig?.extra?.ADMIN_PASSWORD}
  APP_VERSION: ${Constants.expoConfig?.extra?.version}
  REPLACERS: ${JSON.stringify(REPLACERS, null, 2)}
--------------------------------`);
}

export const WS_URL_BASE = Constants.expoConfig?.extra?.WS_URL_BASE as string;
export const APP_VERSION = Constants.expoConfig?.extra?.version as string;
export const API_URL_BASE = Constants.expoConfig?.extra?.API_URL_BASE as string;
export const ADMIN_PASSWORD = Constants.expoConfig?.extra
  ?.ADMIN_PASSWORD as string;
