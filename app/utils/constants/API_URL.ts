import { Platform } from "react-native";
const isDev = process.env.NODE_ENV === "development";

export const fallbackAPI_URL = "http://137.131.8.63:3000/api";
export const fallbackURL_WEB_SOCKET = "ws://137.131.8.63:3000/";

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
    ? "ws://localhost:3000/"
    : `ws://${getLocalIP()}/`;
