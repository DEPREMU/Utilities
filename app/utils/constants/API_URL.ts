// This file is auto-generated. Do not edit it manually if it's not necessary.
// Generated on 2025-08-06T23:48:46.668Z
import { Platform } from "react-native";
const isDev = process.env.NODE_ENV === "development";
export const API_URL = !isDev
  ? "http://137.131.8.63:3000/api"
  : Platform.OS === "web"
    ? "http://localhost:3000/api"
    : "http://192.168.1.136:3000/api";
export const URL_WEB_SOCKET = !isDev
  ? "ws://137.131.8.63:3000/"
  : Platform.OS === "web"
    ? "ws://localhost:3000/"
    : "ws://192.168.1.136:3000/";
