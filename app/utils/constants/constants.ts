import Constants from "expo-constants";

export const WS_URL_BASE = Constants.expoConfig?.extra?.WS_URL_BASE as string;
export const APP_VERSION =
  (Constants.expoConfig?.extra?.version as string) || "0.0.0";
export const API_URL_BASE = Constants.expoConfig?.extra?.API_URL_BASE as string;
export const ADMIN_PASSWORD = Constants.expoConfig?.extra
  ?.ADMIN_PASSWORD as string;
