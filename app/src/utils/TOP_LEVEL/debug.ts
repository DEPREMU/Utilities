/* eslint-disable no-console */
import { Logger } from "@types";
import DeviceInfo from "react-native-device-info";
import { Platform } from "react-native";
import { Helper, REPLACERS } from "@common";

type ReturnDeviceInfo = {
  deviceId: string;
  deviceName: string;
};

const FILTER_BY_MESSAGE: string[] = [];

const getCurrentDeviceInfo = async () => {
  let deviceId: string = "";

  try {
    const { storageManagement } = await import("@/utils/services/storage");
    deviceId = storageManagement.get("DEVICE_ID");
    const deviceName = await DeviceInfo.getDeviceName();

    return {
      deviceId,
      deviceName:
        !deviceName || deviceName === "unknown"
          ? "Platform: " + Platform.OS
          : deviceName,
    } satisfies ReturnDeviceInfo;
  } catch {
    if (!deviceId) deviceId = "Unknown Device";

    return {
      deviceId,
      deviceName: "Unknown Device",
    } satisfies ReturnDeviceInfo;
  }
};

const uploadLogToServer = async (
  type: "log" | "warn" | "error",
  message: string,
) => {
  try {
    const [ServerFetch, getCurrentUserId] = await import("@utils").then(
      (mod) => [mod.ServerFetch, mod.getCurrentUserId] as const,
    );

    const [userId, deviceInfo] = await Promise.all([
      getCurrentUserId(),
      getCurrentDeviceInfo(),
    ]);

    ServerFetch.post("/logs/add", {
      body: {
        ...deviceInfo,
        type,
        userId,
        message,
        timestamp: new Date().toISOString(),
      },
    });
  } catch (error) {
    console.error("Failed to upload log to server:", error);
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
const log = (...args: unknown[]): void => {
  if (REPLACERS.isProduction) return;
  if (
    FILTER_BY_MESSAGE.length &&
    !FILTER_BY_MESSAGE.some((msg) => args.includes(msg))
  )
    return;

  const date = new Date();

  const firstMessage = `Info - ${date.toLocaleString()} ::\n`;
  const message = Helper.getMessage(...args);
  const cleanMessage = Helper.stripAnsi(message);

  if (REPLACERS.isDev) {
    if (REPLACERS.isWeb) {
      console.log(
        `%c${firstMessage}`,
        "color: #3b82f6; font-weight: bold;",
        cleanMessage,
      );
    } else {
      console.log(firstMessage, cleanMessage);
    }
  } else if (REPLACERS.isPreview) {
    uploadLogToServer("log", [firstMessage, cleanMessage].join(" "));
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
 * REPLACERS.Logger.logWarn("User validation failed", { userId: 123, error: "Invalid email" });
 * REPLACERS.Logger.logWarn("API rate limit exceeded");
 * ```
 */
const warn = async (...args: unknown[]): Promise<void> => {
  if (REPLACERS.isProduction) return;
  if (
    FILTER_BY_MESSAGE.length &&
    !FILTER_BY_MESSAGE.some((msg) => args.includes(msg))
  )
    return;

  const date = new Date();

  const firstMessage = `Warning - ${date.toLocaleString()} ::\n`;
  const message = Helper.getMessage(...args);
  const cleanMessage = Helper.stripAnsi(message);

  if (REPLACERS.isDev) {
    if (REPLACERS.isWeb) {
      console.warn(
        `%c${firstMessage}`,
        "color: #eab308; font-weight: bold;",
        cleanMessage,
      );
    } else {
      console.warn(firstMessage, cleanMessage);
    }
  } else if (REPLACERS.isPreview) {
    await uploadLogToServer("warn", [firstMessage, cleanMessage].join(" "));
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
  if (REPLACERS.isProduction) return;
  if (
    FILTER_BY_MESSAGE.length &&
    !FILTER_BY_MESSAGE.some((msg) => args.includes(msg))
  )
    return;

  const date = new Date();
  const firstMessage = `Error - ${date.toLocaleString()} ::\n`;
  const message = Helper.getMessage(...args);
  const cleanMessage = Helper.stripAnsi(message);

  if (REPLACERS.isDev) {
    if (REPLACERS.isWeb) {
      console.error(
        `%c${firstMessage}`,
        "color: #ef4444; font-weight: bold;",
        cleanMessage,
      );
    } else {
      console.error(firstMessage, cleanMessage);
    }
  } else if (REPLACERS.isPreview) {
    await uploadLogToServer("error", [firstMessage, cleanMessage].join(" "));
  }
};

const fun = () => {};

export const logger: Logger = !REPLACERS.isProduction
  ? { log, warn, error }
  : { log: fun, warn: fun, error: fun };
