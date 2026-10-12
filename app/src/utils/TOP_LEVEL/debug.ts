/* eslint-disable no-console */
import DeviceInfo from "react-native-device-info";
import { ILogger } from "@types";
import { Platform } from "react-native";
import { Helper, REPLACERS } from "@common";

type ReturnDeviceInfo = {
  deviceId: string;
  deviceName: string;
};

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

export class Logger implements ILogger {
  #moduleName: string;

  createMessage(level: "log" | "warn" | "error", message: string): string {
    const date = new Date();

    const firstMessage = `${level.toUpperCase()} - ${date.toLocaleString()} - ${this.#moduleName} ::\n`;
    const cleanMessage = Helper.stripAnsi(message);
    return `${firstMessage}${cleanMessage}`;
  }

  async log(...args: unknown[]): Promise<void> {
    if (REPLACERS.isProduction) return;

    const message = this.createMessage("log", Helper.getMessage(...args));

    if (REPLACERS.isDev) {
      if (REPLACERS.isWeb) {
        console.log(`%c${message}`, "color: #3b82f6; font-weight: bold;");
      } else {
        console.log(message);
      }
    } else if (REPLACERS.isPreview) {
      await uploadLogToServer("log", message);
    }
  }

  async warn(...args: unknown[]): Promise<void> {
    if (REPLACERS.isProduction) return;

    const message = this.createMessage("warn", Helper.getMessage(...args));

    if (REPLACERS.isDev) {
      if (REPLACERS.isWeb) {
        console.warn(`%c${message}`, "color: #eab308; font-weight: bold;");
      } else {
        console.warn(message);
      }
    } else if (REPLACERS.isPreview) {
      await uploadLogToServer("warn", message);
    }
  }

  async error(...args: unknown[]): Promise<void> {
    if (REPLACERS.isProduction) return;

    const message = this.createMessage("error", Helper.getMessage(...args));

    if (REPLACERS.isDev) {
      if (REPLACERS.isWeb) {
        console.error(`%c${message}`, "color: #ef4444; font-weight: bold;");
      } else {
        console.error(message);
      }
    } else if (REPLACERS.isPreview) {
      await uploadLogToServer("error", message);
    }
  }

  secret: (value: unknown) => string = Helper.secret;

  constructor(moduleName: string) {
    this.#moduleName = moduleName;
  }
}
