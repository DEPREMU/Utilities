/* eslint-disable no-console */
import Chalk from "chalk";
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

  if (REPLACERS.isDev) console.log(Chalk.blue.bold(firstMessage), message);
  else if (REPLACERS.isPreview)
    uploadLogToServer("log", [firstMessage, message].join(" "));
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

  if (REPLACERS.isDev) console.warn(Chalk.yellow.bold(firstMessage), message);
  else if (REPLACERS.isPreview)
    await uploadLogToServer("warn", [firstMessage, message].join(" "));
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

  if (REPLACERS.isDev) console.error(Chalk.red.bold(firstMessage), message);
  else if (REPLACERS.isPreview)
    await uploadLogToServer("error", [firstMessage, message].join(" "));
};

const fun = () => {};

export const logger: Logger = !REPLACERS.isProduction
  ? { log, warn, error }
  : { log: fun, warn: fun, error: fun };
