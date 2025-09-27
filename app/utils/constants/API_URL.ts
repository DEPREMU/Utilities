/* eslint-disable no-console */
import Constants from "expo-constants";
import { Platform } from "react-native";

const isDev = process.env.NODE_ENV === "development" || __DEV__;

export const fallbackAPI_URL: string =
  Constants.expoConfig?.extra?.API_URL || "http://158.101.7.150:3000/api";
export const fallbackURL_WEB_SOCKET: string =
  Constants.expoConfig?.extra?.WS_URL || "ws://158.101.7.150:3000/ws";

if (!Constants.expoConfig?.extra?.API_URL && isDev) {
  console.warn(
    "API_URL is not defined in environment variables, using fallback URL.",
  );
}
if (!Constants.expoConfig?.extra?.WS_URL && isDev) {
  console.warn(
    "WS_URL is not defined in environment variables, using fallback URL.",
  );
}

const getLocalIP = () => {
  console.warn(
    "Getting local IP address has been called, make sure you configure your local IP.",
  );

  return "192.168.1.136:3000";
};

export const API_URL = !isDev
  ? fallbackAPI_URL
  : Platform.OS === "web"
    ? "http://localhost:3000/api"
    : `http://${getLocalIP()}/api`;
export const URL_WEB_SOCKET = !isDev
  ? fallbackURL_WEB_SOCKET
  : Platform.OS === "web"
    ? "ws://localhost:3000/ws"
    : `ws://${getLocalIP()}/ws`;
export const CLIPBOARD_WS_URL = !isDev
  ? `${fallbackURL_WEB_SOCKET.replace("/ws", "/clipboard")}`
  : Platform.OS === "web"
    ? "ws://localhost:3000/clipboard"
    : `ws://${getLocalIP()}/clipboard`;
