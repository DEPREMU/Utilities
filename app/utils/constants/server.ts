/* eslint-disable no-console */
import { API_URL_BASE, REPLACERS, WS_URL_BASE } from "./constants";

export const fallbackAPI_URL: string = API_URL_BASE;
export const fallbackURL_WEB_SOCKET: string = WS_URL_BASE;

if (!API_URL_BASE && REPLACERS.isDev) {
  console.warn(
    "API_URL is not defined in environment variables, using fallback URL.",
  );
}
if (!WS_URL_BASE && REPLACERS.isDev) {
  console.warn(
    "WS_URL is not defined in environment variables, using fallback URL.",
  );
}

const getLocalIP = () => {
  console.warn(
    "\n\nGetting local IP address has been called, make sure you configure your local IP\n",
  );

  return "192.168.1.163:3000";
};

export const API_URL = !REPLACERS.isDev
  ? fallbackAPI_URL
  : REPLACERS.isWeb
    ? "http://localhost:3000/api"
    : `http://${getLocalIP()}/api`;
export const URL_WEB_SOCKET = !REPLACERS.isDev
  ? fallbackURL_WEB_SOCKET
  : REPLACERS.isWeb
    ? "ws://localhost:3000/ws"
    : `ws://${getLocalIP()}/ws`;
export const CLIPBOARD_WS_URL = !REPLACERS.isDev
  ? `${fallbackURL_WEB_SOCKET.replace("/ws", "/clipboard")}`
  : REPLACERS.isWeb
    ? "ws://localhost:3000/clipboard"
    : `ws://${getLocalIP()}/clipboard`;
export const QR_LOGIN_WS_URL = !REPLACERS.isDev
  ? `${fallbackURL_WEB_SOCKET.replace("/ws", "/ws-login-qr")}`
  : REPLACERS.isWeb
    ? "ws://localhost:3000/ws-login-qr"
    : `ws://${getLocalIP()}/ws-login-qr`;
