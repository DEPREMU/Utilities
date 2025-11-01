/* eslint-disable no-console */
import Chalk from "chalk";
import DeviceInfo from "react-native-device-info";
import { Platform } from "react-native";
import { getCurrentUserId } from "./auth";
import { RequestDatabaseInsert } from "@types";
import { fetchOptions, getRouteAPI } from "./APIManagement";
import { checkLanguage, loadDataSecure } from "./storageManagement";

type Return = {
  deviceId: string;
  deviceName: string;
};

const getCurrentDeviceInfo = async (): Promise<Return> => {
  const fallback = "Platform: " + Platform.OS;
  try {
    let [deviceId, deviceName] = await Promise.all([
      loadDataSecure("_deviceId"),
      DeviceInfo.getDeviceName(),
    ]);
    if (!deviceId || deviceId === "unknown")
      deviceId = DeviceInfo.getDeviceId();
    if (!deviceId || deviceId === "unknown") deviceId = fallback;
    if (!deviceName || deviceName === "unknown") deviceName = fallback;

    return { deviceId, deviceName };
  } catch {
    return {
      deviceId: fallback,
      deviceName: "Unknown Device",
    };
  }
};

/**
 * Logs a message to the console or sends it to a server.
 *
 * @param args - The error message and additional data to log.
 *
 * @remarks
 * - In development mode, logs to the console.
 * - In preview mode, sends the log to a server endpoint.
 * - In production mode, does nothing.
 */
export const log = async (...args: unknown[]): Promise<void> => {
  const env = process.env.NODE_ENV;
  const isProduction: boolean = env === "production";
  if (isProduction) return;
  const isDev: boolean = __DEV__ || env === "development";
  const isPreview: boolean = env === "preview";
  if (!isPreview && !isDev) return;

  const date = new Date();

  const firstMessage = `Log - ${date.toLocaleString()} ::\n`;

  if (isDev)
    console.log(
      Chalk.blue.bold(firstMessage),
      ...args.map((arg) =>
        typeof arg === "object" ? JSON.stringify(arg, null, 2) : arg,
      ),
    );
  else if (isPreview) {
    const message = [firstMessage, ...args]
      .filter(Boolean)
      .map((arg) =>
        typeof arg === "object" ? JSON.stringify(arg, null, 2) : arg,
      )
      .join(" ");

    getRouteAPI("/database/insert").then(async (url) => {
      const [lang, userId, token, deviceInfo] = await Promise.all([
        checkLanguage(),
        getCurrentUserId(),
        loadDataSecure("_userSessionTokenStorage"),
        getCurrentDeviceInfo(),
      ]);

      if (!userId || !token) return;

      fetch(
        url,
        fetchOptions<RequestDatabaseInsert<"Logs">>(
          "POST",
          {
            lang,
            table: "Logs",
            values: {
              type: "log",
              userId,
              message,
              timestamp: date.toISOString(),
              deviceId: deviceInfo.deviceId,
              deviceName: deviceInfo.deviceName,
            },
          },
          token,
        ),
      );
    });
  }
};

/**
 * Logs warning messages based on the current environment.
 *
 * In development mode, logs to console using console.warn.
 * In preview mode, sends the warning message to a remote logging API endpoint.
 * In production mode (non-preview), the function returns early without logging.
 *
 * @param args - Variable number of arguments of any type to be logged as warning messages
 * @returns A Promise that resolves when the logging operation is complete
 *
 * @example
 * ```typescript
 * await logWarn("User validation failed", { userId: 123, error: "Invalid email" });
 * await logWarn("API rate limit exceeded");
 * ```
 */
export const logWarn = async (...args: unknown[]): Promise<void> => {
  const env = process.env.NODE_ENV;
  const isDev = env === "development" || __DEV__;
  const isPreview = env === "preview";
  const isProduction = env === "production";

  if (isProduction && !isPreview && !isDev) return;

  const date = new Date();

  const firstMessage = `Warning - ${date.toLocaleString()} ::\n`;

  if (isDev) console.warn(Chalk.yellow.bold(firstMessage), ...args);
  else if (isPreview) {
    const warningMessage = [firstMessage, ...args]
      .filter(Boolean)
      .map((arg) =>
        typeof arg === "object" ? JSON.stringify(arg, null, 2) : arg,
      )
      .join(" ");

    getRouteAPI("/database/insert").then(async (url) => {
      const [lang, userId, token, deviceInfo] = await Promise.all([
        checkLanguage(),
        getCurrentUserId(),
        loadDataSecure("_userSessionTokenStorage"),
        getCurrentDeviceInfo(),
      ]);

      if (!userId || !token) return;

      fetch(
        url,
        fetchOptions<RequestDatabaseInsert<"Logs">>(
          "POST",
          {
            lang,
            table: "Logs",
            values: {
              type: "warn",
              userId,
              message: warningMessage,
              timestamp: date.toISOString(),
              deviceId: deviceInfo.deviceId,
              deviceName: deviceInfo.deviceName,
            },
          },
          token,
        ),
      );
    });
  }
};

/**
 * Logs an error message to the console or sends it to a server.
 *
 * @param args - The error message and additional data to log.
 *
 * @remarks
 * - In development mode, logs to the console.
 * - In preview mode, sends the log to a server endpoint.
 * - In production mode, does nothing.
 */
export const logError = async (...args: unknown[]): Promise<void> => {
  const env = process.env.NODE_ENV;
  const isDev = env === "development" || __DEV__;
  const isPreview = env === "preview";
  const isProduction = env === "production";

  if (isProduction && !isPreview && !isDev) return;

  const date = new Date();

  const firstMessage = `Error - ${date.toLocaleString()} ::\n`;

  if (isDev)
    console.error(
      Chalk.red.bold(firstMessage),
      ...args.map((arg) =>
        typeof arg === "object" ? JSON.stringify(arg, null, 2) : arg,
      ),
    );
  else if (isPreview) {
    const errorMessage = [firstMessage, ...args]
      .filter(Boolean)
      .map((arg) =>
        typeof arg === "object" ? JSON.stringify(arg, null, 2) : arg,
      )
      .join(" ");

    getRouteAPI("/database/insert").then(async (url) => {
      const [lang, userId, token, deviceInfo] = await Promise.all([
        checkLanguage(),
        getCurrentUserId(),
        loadDataSecure("_userSessionTokenStorage"),
        getCurrentDeviceInfo(),
      ]);

      if (!userId || !token) return;

      fetch(
        url,
        fetchOptions<RequestDatabaseInsert<"Logs">>(
          "POST",
          {
            lang,
            table: "Logs",
            values: {
              type: "error",
              userId,
              message: errorMessage,
              timestamp: date.toISOString(),
              deviceId: deviceInfo.deviceId,
              deviceName: deviceInfo.deviceName,
            },
          },
          token,
        ),
      );
    });
  }
};
