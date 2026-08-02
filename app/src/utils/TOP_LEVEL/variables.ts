import Constants from "expo-constants";
import { Colors } from "@types";
import { REPLACERS, ServerFetch } from "@common";

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

ServerFetch.API_URL = API_URL;

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

export const colors = {
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
} as const satisfies Record<"dark" | "light", Record<Colors, string>>;
