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

if (REPLACERS.isNative) import("./global.native");

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

const getLocalIP = () => {
  // eslint-disable-next-line no-console
  console.warn(
    "\n--------------------------------------",
    "\nGetting local IP address has been called, make sure you configure your local IP",
    "\n--------------------------------------",
  );

  return "192.168.1.163:3000";
};

const ip = REPLACERS.isDev ? getLocalIP() : "";

const wsUrl: string = Constants.expoConfig?.extra?.WS_URL_BASE;
const apiUrl: string = Constants.expoConfig?.extra?.API_URL_BASE;

const wsUrlFormatted = wsUrl.endsWith("/") ? wsUrl.slice(0, -1) : wsUrl;
const apiUrlFormatted = apiUrl.endsWith("/") ? apiUrl.slice(0, -1) : apiUrl;

const API_URL = REPLACERS.isProduction
  ? apiUrlFormatted
  : REPLACERS.isWeb
    ? "http://localhost:3000/api"
    : `http://${ip}/api`;
const BASE_URL_WEB_SOCKET = REPLACERS.isProduction
  ? wsUrlFormatted
  : REPLACERS.isWeb
    ? "ws://localhost:3000"
    : `ws://${ip}`;

export const URLS = {
  ws: BASE_URL_WEB_SOCKET + "/ws",
  api: API_URL,
  clipboard: BASE_URL_WEB_SOCKET + "/clipboard",
  wsCryptos: BASE_URL_WEB_SOCKET + "/ws-cryptos",
  wsLoginQr: BASE_URL_WEB_SOCKET + "/ws-login-qr",
};

export const PRODUCTION_URLS = REPLACERS.isDev
  ? {
      ws: wsUrlFormatted + "/ws",
      api: apiUrlFormatted,
      clipboard: wsUrlFormatted + "/clipboard",
      wsCryptos: wsUrlFormatted + "/ws-cryptos",
      wsLoginQr: wsUrlFormatted + "/ws-login-qr",
    }
  : null;

export const APP_VERSION = Constants.expoConfig?.extra?.version as string;
export const ADMIN_PASSWORD = Constants.expoConfig?.extra
  ?.ADMIN_PASSWORD as string;

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
