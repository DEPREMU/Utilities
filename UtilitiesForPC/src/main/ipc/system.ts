import { exec } from "child_process";
import dataApp from "../utils/variables";
import { Logger } from "../utils/logger";
import { nativeData } from "../utils/nativeData";
import {
  restartComputer,
  scheduleReconnect,
  turnOffComputer,
} from "../utils/server";
import { IpcHandlersRecord } from "./types";

export const systemIpcHandlers: IpcHandlersRecord<
  | "system.turnOff"
  | "system.restart"
  | "system.getNativeData"
  | "system.setData"
  | "system.notifyLoginStatus"
  | "system.executeCommand"
  | "system.isElectronBuild"
> = {
  "system.turnOff": {
    type: "handle",
    func: async () => {
      Logger.log("Received system.turnOff request");
      return await turnOffComputer();
    },
  },
  "system.restart": {
    type: "handle",
    func: async () => {
      Logger.log("Received system.restart request");
      return await restartComputer();
    },
  },
  "system.getNativeData": {
    type: "handle",
    func: async (_event, key) => {
      const result = nativeData.getValue(key);
      Logger.log(
        `Received system.getNativeData request for key: ${key}, value: ${result}`,
      );
      return result;
    },
  },
  "system.setData": {
    type: "on",
    func: (_event, deviceId, language) => {
      Logger.log("Received system.setData request:", { deviceId, language });
      dataApp.setValue("deviceId", deviceId);
      dataApp.setValue("language", language);

      scheduleReconnect("set-data-electron called");
    },
  },
  "system.notifyLoginStatus": {
    type: "on",
    func: (_event, isLoggedIn) => {
      dataApp.setValue("userIsLoggedIn", isLoggedIn);

      if (dataApp.getValue("webRestarted")) return;
      dataApp.setValue("webRestarted", true);

      const mainWindow = dataApp.getValue("mainWindow");
      if (!mainWindow) return;

      Logger.log(`Received system.notifyLoginStatus: ${isLoggedIn}`);

      if (isLoggedIn) mainWindow.hide();
      else mainWindow.show();
    },
  },
  "system.executeCommand": {
    type: "handle",
    func: async (_event, command) => {
      Logger.log(`Received system.executeCommand request: ${command}`);

      const result = await new Promise<string>((resolve) => {
        exec(command, (error, stdout, stderr) => {
          if (error) {
            Logger.error(`Command execution error: ${error.message}`);
            resolve(error.message);
            return;
          }
          if (stderr) {
            Logger.error(`Command execution stderr: ${stderr}`);
            resolve(stderr);
            return;
          }
          Logger.log(`Command execution stdout: ${stdout}`);
          resolve(stdout);
        });
      });

      return result;
    },
  },
  "system.isElectronBuild": {
    type: "handle",
    func: async () => {
      Logger.log("Received system.isElectronBuild request");
      return true;
    },
  },
};
