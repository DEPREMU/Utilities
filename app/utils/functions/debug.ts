import { wrapFunctionWithError } from "@common";

/* eslint-disable no-console */
import Chalk from "chalk";
import DeviceInfo from "react-native-device-info";
import { Platform } from "react-native";
import { REPLACERS } from "../constants/constants";
import { fetchToServer } from "./APIManagement";
import { loadDataStorage } from "./storageManagement";
import { getCurrentUserId } from "./auth";

type ReturnDeviceInfo = {
  deviceId: string;
  deviceName: string;
};

const FILTER_BY_MESSAGE: string[] = [];

const getCurrentDeviceInfo = wrapFunctionWithError(
  async () => {
    const [deviceId, deviceName] = await Promise.all([
      loadDataStorage("DEVICE_ID"),
      DeviceInfo.getDeviceName(),
    ]);

    return {
      deviceId,
      deviceName:
        !deviceName || deviceName === "unknown"
          ? "Platform: " + Platform.OS
          : deviceName,
    } as ReturnDeviceInfo;
  },
  true,
  (_, errMsg) => {
    error?.("Error getting device info:", errMsg);
    return {
      deviceId: "Platform: " + Platform.OS,
      deviceName: "Unknown Device",
    } as ReturnDeviceInfo;
  },
);

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
const log = async (...args: unknown[]): Promise<void> => {
  if (!REPLACERS.isPreview && !REPLACERS.isDev) return;
  if (
    FILTER_BY_MESSAGE.length &&
    !FILTER_BY_MESSAGE.some((msg) => args.includes(msg))
  )
    return;

  const date = new Date();

  const firstMessage = `Log - ${date.toLocaleString()} ::\n`;

  if (REPLACERS.isDev)
    console.log(
      Chalk.blue.bold(firstMessage),
      ...args.map((arg) =>
        typeof arg === "object" ? JSON.stringify(arg, null, 2) : arg,
      ),
    );
  else if (REPLACERS.isPreview) {
    try {
      const message = [firstMessage, ...args]
        .filter(Boolean)
        .map((arg) =>
          typeof arg === "object" ? JSON.stringify(arg, null, 2) : arg,
        )
        .join(" ");

      const [userId, deviceInfo] = await Promise.all([
        getCurrentUserId(),
        getCurrentDeviceInfo(),
      ]);

      fetchToServer("/log", {
        type: "log",
        userId: userId || "",
        message,
        timestamp: date.toISOString(),
        ...deviceInfo,
      });
    } catch (error) {
      console.error("Failed to log message to server:", error);
    }
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
 * awaitlogger.logWarn("User validation failed", { userId: 123, error: "Invalid email" });
 * awaitlogger.logWarn("API rate limit exceeded");
 * ```
 */
const warn = async (...args: unknown[]): Promise<void> => {
  if (!REPLACERS.isPreview && !REPLACERS.isDev) return;
  if (
    FILTER_BY_MESSAGE.length &&
    !FILTER_BY_MESSAGE.some((msg) => args.includes(msg))
  )
    return;

  const date = new Date();

  const firstMessage = `Warning - ${date.toLocaleString()} ::\n`;

  if (REPLACERS.isDev) console.warn(Chalk.yellow.bold(firstMessage), ...args);
  else if (REPLACERS.isPreview) {
    try {
      const warningMessage = [firstMessage, ...args]
        .filter(Boolean)
        .map((arg) =>
          typeof arg === "object" ? JSON.stringify(arg, null, 2) : arg,
        )
        .join(" ");

      const [userId, deviceInfo] = await Promise.all([
        getCurrentUserId(),
        getCurrentDeviceInfo(),
      ]);

      fetchToServer("/log", {
        type: "warn",
        userId: userId || "",
        message: warningMessage,
        timestamp: date.toISOString(),
        deviceId: deviceInfo.deviceId || "",
        deviceName: deviceInfo.deviceName,
      });
    } catch (error) {
      console.error("Failed to log warning to server:", error);
    }
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
const error = async (...args: unknown[]): Promise<void> => {
  if (!REPLACERS.isPreview && !REPLACERS.isDev) return;
  if (
    FILTER_BY_MESSAGE.length &&
    !FILTER_BY_MESSAGE.some((msg) => args.includes(msg))
  )
    return;

  const date = new Date();
  const firstMessage = `Error - ${date.toLocaleString()} ::\n`;

  if (REPLACERS.isDev)
    console.error(
      Chalk.red.bold(firstMessage),
      ...args.map((arg) =>
        typeof arg === "object" ? JSON.stringify(arg, null, 2) : arg,
      ),
    );
  else if (REPLACERS.isPreview) {
    try {
      const errorMessage = [firstMessage, ...args]
        .filter(Boolean)
        .map((arg) =>
          typeof arg === "object" ? JSON.stringify(arg, null, 2) : arg,
        )
        .join(" ");

      const [userId, deviceInfo] = await Promise.all([
        getCurrentUserId(),
        getCurrentDeviceInfo(),
      ]);

      fetchToServer("/log", {
        type: "error",
        userId: userId || "",
        message: errorMessage,
        timestamp: date.toISOString(),
        deviceId: deviceInfo.deviceId || "",
        deviceName: deviceInfo.deviceName,
      });
    } catch (error) {
      console.error("Failed to log error to server:", error);
    }
  }
};

export const logger = !REPLACERS.isProduction
  ? {
      log,
      warn,
      error,
    }
  : {
      log: async () => {},
      warn: async () => {},
      error: async () => {},
    };
