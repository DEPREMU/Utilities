import {
  getStorageFileValue,
  saveStorageFileValue,
  removeStorageFileValue,
} from "./storage";
import dataApp from "./variables";
import { exec } from "child_process";
import nativeData from "./nativeData";
import { writeLog } from "./logger";
import { sendNotification } from "./notifications";
import { ChannelsIpcRenderer } from "@types";
import { ipcMain, IpcMainEvent, IpcMainInvokeEvent } from "electron";
import { restartComputer, scheduleReconnect, turnOffComputer } from "./server";

type IpcDictHybrid = {
  [K in keyof ChannelsIpcRenderer]:
    | ChannelsIpcRenderer[K]["typeIpc"] extends "send"
    ? {
        type: "on";
        func: (
          event: IpcMainEvent,
          ...args: ChannelsIpcRenderer[K]["functionArgs"]
        ) => ChannelsIpcRenderer[K]["functionReturn"];
      }
    : {
        type: "handle";
        func: (
          event: IpcMainInvokeEvent,
          ...args: ChannelsIpcRenderer[K]["functionArgs"]
        ) => ChannelsIpcRenderer[K]["functionReturn"];
      };
};

const ipcDict: IpcDictHybrid = {
  "user-login-status": {
    type: "on",
    func: (_event, isLoggedIn) => {
      dataApp.setValue("userIsLoggedIn", isLoggedIn);

      if (dataApp.getValue("webRestarted")) return;
      dataApp.setValue("webRestarted", true);

      const mainWindow = dataApp.getValue("mainWindow");
      if (!mainWindow) return;

      writeLog(`Received user-login-status: ${isLoggedIn}`, "info");

      if (isLoggedIn) mainWindow.hide();
      else mainWindow.show();
    },
  },
  "set-data-electron": {
    type: "on",
    func: (_event, deviceId, language) => {
      writeLog(
        "Received set-data-electron request: " +
          JSON.stringify({ deviceId, language }, null, 2),
        "info"
      );
      dataApp.setValue("deviceId", deviceId);
      dataApp.setValue("language", language);

      scheduleReconnect("set-data-electron called");
    },
  },
  "send-notification": {
    type: "on",
    func: (_event, notification) => {
      writeLog(
        `Received send-notification request: ${JSON.stringify(
          notification,
          null,
          2
        )}`,
        "info"
      );
      sendNotification(notification);
    },
  },
  "get-native-data": {
    type: "handle",
    func: async (_event, key) => {
      const result = nativeData.getValue(key);
      writeLog(
        `Received get-native-data request for key: ${key}, value: ${result}`,
        "info"
      );
      return result;
    },
  },

  "execute-command": {
    type: "handle",
    func: async (_event, command) => {
      writeLog(`Received execute-command request: ${command}`, "info");

      const result = await new Promise<string>((resolve) => {
        exec(command, (error, stdout, stderr) => {
          if (error) {
            writeLog(`Command execution error: ${error.message}`, "error");
            resolve(error.message);
            return;
          }
          if (stderr) {
            writeLog(`Command execution stderr: ${stderr}`, "error");
            resolve(stderr);
            return;
          }
          writeLog(`Command execution stdout: ${stdout}`, "info");
          resolve(stdout);
        });
      });

      return result;
    },
  },
  "turn-off-computer": {
    type: "handle",
    func: async () => {
      writeLog("Received turn-off-computer request", "info");
      return await turnOffComputer();
    },
  },
  "restart-computer": {
    type: "handle",
    func: async () => {
      writeLog("Received restart-computer request", "info");
      return await restartComputer();
    },
  },
  "save-data": {
    type: "handle",
    func: async (_event, key, value) => {
      try {
        writeLog(`Received save-data request for key: ${key}`, "info");
        const success = await saveStorageFileValue(key, value);
        if (success)
          writeLog(`Data saved successfully for key: ${key}`, "info");
        else writeLog(`Failed to save data for key: ${key}`, "error");

        return { success };
      } catch (error) {
        writeLog(`Error saving data for key ${key}: ` + String(error), "error");
        return { success: false };
      }
    },
  },
  "load-data": {
    type: "handle",
    func: async (_event, key) => {
      try {
        return await getStorageFileValue(key);
      } catch (error) {
        writeLog(
          `Error loading data for key ${key}: ` + String(error),
          "error"
        );
        return null;
      }
    },
  },
  "remove-data": {
    type: "handle",
    func: async (_event, key) => {
      writeLog(`Received remove-data request for key: ${key}`, "info");
      try {
        return await removeStorageFileValue(key);
      } catch (error) {
        writeLog(
          `Failed to remove data for key: ${key}, error: ${error}`,
          "error"
        );
      }
      return false;
    },
  },
  "is-electron-build": {
    type: "handle",
    func: async () => {
      writeLog("Received is-electron-build request", "info");
      return true;
    },
  },
};

Object.entries(ipcDict).forEach(([channel, { type, func }]) => {
  ipcMain?.[type]?.(channel, func as any);
});
