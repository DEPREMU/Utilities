import { Platform } from "react-native";
import { logWarn } from "../functions";

const isDev = process.env.NODE_ENV === "development";

export const fallbackAPI_URL =
  process.env.API_URL || "http://137.131.8.63:3000/api";
export const fallbackURL_WEB_SOCKET =
  process.env.WS_URL || "ws://137.131.8.63:3000/";

if (!process.env.API_URL && isDev) {
  logWarn(
    "API_URL is not defined in environment variables, using fallback URL.",
  );
}
if (!process.env.WS_URL && isDev) {
  logWarn(
    "WS_URL is not defined in environment variables, using fallback URL.",
  );
}

const getLocalIP = () => {
  logWarn(
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
    ? "ws://localhost:3000/"
    : `ws://${getLocalIP()}/`;
