/* eslint-disable no-console */
import Chalk from "chalk";
import DeviceInfo from "react-native-device-info";
import { Platform } from "react-native";
import { REPLACERS } from "../TOP_LEVEL";
import { storageManagement } from "../services/storage";

type ReturnDeviceInfo = {
  deviceId: string;
  deviceName: string;
};

const FILTER_BY_MESSAGE: string[] = [];

const getCurrentDeviceInfo = async () => {
  try {
    const deviceName = await DeviceInfo.getDeviceName();
    const deviceId = storageManagement.get("DEVICE_ID");

    return {
      deviceId,
      deviceName:
        !deviceName || deviceName === "unknown"
          ? "Platform: " + Platform.OS
          : deviceName,
    } satisfies ReturnDeviceInfo;
  } catch {
    return {
      deviceId: storageManagement.get("DEVICE_ID"),
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
      ...deviceInfo,
      type,
      userId,
      message,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error("Failed to upload log to server:", error);
  }
};

const getMessage = (...args: unknown[]): unknown[] => {
  return args
    .filter(Boolean)
    .map((arg) =>
      typeof arg === "object" && arg !== null
        ? JSON.stringify(arg, null, 2)
        : arg,
    );
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
const log = async (...args: unknown[]): Promise<void> => {
  if (REPLACERS.isProduction) return;
  if (
    FILTER_BY_MESSAGE.length &&
    !FILTER_BY_MESSAGE.some((msg) => args.includes(msg))
  )
    return;

  const date = new Date();

  const firstMessage = `Log - ${date.toLocaleString()} ::\n`;
  const message = getMessage(...args);

  if (REPLACERS.isDev) console.log(Chalk.blue.bold(firstMessage), ...message);
  else if (REPLACERS.isPreview)
    await uploadLogToServer("log", [firstMessage, ...message].join(" "));
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
 * logger.logWarn("User validation failed", { userId: 123, error: "Invalid email" });
 * logger.logWarn("API rate limit exceeded");
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
  const message = getMessage(...args);

  if (REPLACERS.isDev)
    console.warn(Chalk.yellow.bold(firstMessage), ...message);
  else if (REPLACERS.isPreview)
    await uploadLogToServer("warn", [firstMessage, ...message].join(" "));
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
  const message = getMessage(...args);

  if (REPLACERS.isDev) console.error(Chalk.red.bold(firstMessage), ...message);
  else if (REPLACERS.isPreview)
    await uploadLogToServer("error", [firstMessage, ...message].join(" "));
};

const fun = async () => {};

export const logger = !REPLACERS.isProduction
  ? { log, warn, error }
  : { log: fun, warn: fun, error: fun };
