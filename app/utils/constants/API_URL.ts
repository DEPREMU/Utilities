// This file is auto-generated. Do not edit it manually if it's not necessary.
// Generated on 2025-08-06T23:48:46.668Z
import { Platform } from "react-native";
const isDev = process.env.NODE_ENV === "development";
export const API_URL = !isDev
  ? "https://api.utilities/api"
  : Platform.OS === "web"
    ? "http://localhost:3000/api"
    : "http://192.168.1.209:3000/api";
export const URL_WEB_SOCKET = !isDev
  ? "wss://api.utilities/"
  : Platform.OS === "web"
    ? "ws://localhost:3000/"
    : "ws://192.168.1.209:3000/";
