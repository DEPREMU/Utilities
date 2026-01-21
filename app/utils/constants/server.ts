/* eslint-disable no-console */
import { Platform } from "react-native";
import { API_URL_BASE, WS_URL_BASE } from "./constants";

const isDev = process.env.NODE_ENV === "development";

export const fallbackAPI_URL: string = API_URL_BASE;
export const fallbackURL_WEB_SOCKET: string = WS_URL_BASE;

if (!API_URL_BASE && isDev) {
  console.warn(
    "API_URL is not defined in environment variables, using fallback URL.",
  );
}
if (!WS_URL_BASE && isDev) {
  console.warn(
    "WS_URL is not defined in environment variables, using fallback URL.",
  );
}

const getLocalIP = () => {
  console.warn(
    "\n\nGetting local IP address has been called, make sure you configure your local IP\n",
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
export const QR_LOGIN_WS_URL = !isDev
  ? `${fallbackURL_WEB_SOCKET.replace("/ws", "/ws-login-qr")}`
  : Platform.OS === "web"
    ? "ws://localhost:3000/ws-login-qr"
    : `ws://${getLocalIP()}/ws-login-qr`;
