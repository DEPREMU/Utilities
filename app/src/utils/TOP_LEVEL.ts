import NetInfo from "@react-native-community/netinfo";
import Constants from "expo-constants";
import { Platform } from "react-native";
import { Colors, REPLACERS_TYPE } from "@types";

NetInfo.configure({
  useNativeReachability: true,
  reachabilityUrl: "https://www.google.com/generate_204",
});

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
  APP_VERSION: ${Constants.expoConfig?.extra?.version}
  WS_URL_BASE: ${Constants.expoConfig?.extra?.WS_URL_BASE}
  API_URL_BASE: ${Constants.expoConfig?.extra?.API_URL_BASE}
  ADMIN_PASSWORD: ${Constants.expoConfig?.extra?.ADMIN_PASSWORD}
  REPLACERS: ${JSON.stringify(REPLACERS, null, 2)}
--------------------------------`);
}

export const WS_URL_BASE = Constants.expoConfig?.extra?.WS_URL_BASE as string;
export const APP_VERSION = Constants.expoConfig?.extra?.version as string;
export const API_URL_BASE = Constants.expoConfig?.extra?.API_URL_BASE as string;
export const ADMIN_PASSWORD = Constants.expoConfig?.extra
  ?.ADMIN_PASSWORD as string;

export const colors: Record<"dark" | "light", Record<Colors, string>> = {
  light: {
    primary: "#7c3aed",
    secondary: "#f5f3ff",
    accent: "#a855f7",
    background: "#f8fafc",
    text: "#0f172a",
    border: "#e2e8f0",
    error: "#ef4444",
    warning: "#f59e0b",
    success: "#22c55e",
    info: "#0ea5e9",
    overlay: "rgba(0, 0, 0, 0.45)",
    shadow: "#000000",
  },
  dark: {
    background: "#0f172a",
    secondary: "#111827",
    accent: "#1e293b",
    primary: "#a855f7",
    text: "#e2e8f0",
    border: "#1f2937",
    error: "#f87171",
    warning: "#fbbf24",
    success: "#34d399",
    info: "#38bdf8",
    overlay: "rgba(0, 0, 0, 0.6)",
    shadow: "#000000",
  },
} as const;
