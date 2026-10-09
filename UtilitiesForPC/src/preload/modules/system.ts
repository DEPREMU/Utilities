import { Timers } from "@common";
import { SystemBridge, ExpectedNativeWebData, LanguagesSupported } from "@types";
import { sendMessage } from "../utils/sendMessage";
import { sendLog } from "../utils/logger";

let idleTimeout: number | null = null;

export const systemBridge: SystemBridge = {
  turnOff: async (): Promise<boolean> => {
    return await sendMessage("invoke", "system.turnOff");
  },
  restart: async (): Promise<boolean> => {
    return await sendMessage("invoke", "system.restart");
  },
  getNativeData: async <T extends keyof ExpectedNativeWebData>(
    key: T,
  ): Promise<ExpectedNativeWebData[T]> => {
    try {
      return (await sendMessage(
        "invoke",
        "system.getNativeData",
        key,
      )) as ExpectedNativeWebData[T];
    } catch (error) {
      sendLog(
        "error",
        `Error getting native data for key ${key}:`,
        error instanceof Error ? error.message : String(error),
      );
      return "unknown" as ExpectedNativeWebData[T];
    }
  },
  setData: (deviceId: string, language: LanguagesSupported): void => {
    sendMessage("send", "system.setData", deviceId, language);
  },
  notifyLoginStatus: (isLoggedIn: boolean): void => {
    if (process.env.BUILD_PROFILE === "development") return;

    if (idleTimeout) {
      Timers.clearTimeout(idleTimeout);
      idleTimeout = null;
    }

    idleTimeout = Timers.setTimeout(() => {
      idleTimeout = null;
      sendMessage("send", "system.notifyLoginStatus", isLoggedIn);
    }, 1000);
  },
  executeCommand: async (command: string): Promise<string> => {
    try {
      const result = await sendMessage("invoke", "system.executeCommand", command);
      return result;
    } catch (error) {
      sendLog("error", `Error executing command "${command}":`, error);
      return error instanceof Error ? error.message : String(error);
    }
  },
  isElectronBuild: async (): Promise<boolean> => {
    sendLog("log", "Checking if Electron build...");
    const isElectron = await sendMessage("invoke", "system.isElectronBuild");
    sendLog("log", "isElectronBuild:", isElectron);
    return isElectron;
  },
};
