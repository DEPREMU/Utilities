import {
  getFileInfo,
  copyFileToTemp,
  removeFileWithUri,
} from "../utils/storage";
import dataApp from "../utils/vars/variables";
import { Paths } from "@utils";
import { dialog } from "electron";
import { Logger } from "../utils/logger";
import { zipFolder } from "../utils/zip";
import { IpcHandlersRecord } from "./types";

const logger = new Logger("IPC-File");

export const fileIpcHandlers: IpcHandlersRecord<
  | "file.copyToTemp"
  | "file.remove"
  | "file.pickFolder"
  | "file.getInfo"
  | "file.askPath"
  | "file.zip"
> = {
  "file.copyToTemp": {
    type: "handle",
    func: async (_, base64, filename) => {
      try {
        const info = await copyFileToTemp(base64, filename);
        return { success: !!info, ...(info ? { info } : {}) };
      } catch {
        return { success: false };
      }
    },
  },
  "file.remove": {
    type: "handle",
    func: async (_event, uri) => {
      try {
        return await removeFileWithUri(uri);
      } catch (error) {
        logger.error(`Error removing file with URI ${uri}:`, error);
        return { success: false };
      }
    },
  },
  "file.pickFolder": {
    type: "handle",
    func: async () => {
      try {
        const mainWindow = dataApp.getValue("mainWindow");
        if (!mainWindow) return "canceled";

        const result = await dialog.showOpenDialog(mainWindow, {
          properties: ["openDirectory"],
        });
        if (result.canceled) return "canceled";
        if (result.filePaths.length === 0) return "canceled";

        return result.filePaths[0];
      } catch (error) {
        logger.error("Error picking folder: ", error);
        return "canceled";
      }
    },
  },
  "file.getInfo": {
    type: "handle",
    func: async (_event, filePath) => {
      logger.log(`Received file.getInfo request for path: ${filePath}`);
      const fileInfo = await getFileInfo(filePath);
      return fileInfo;
    },
  },
  "file.askPath": {
    type: "handle",
    func: async () => {
      logger.log("Received file.askPath request");
      return await Paths.askPath();
    },
  },
  "file.zip": {
    type: "handle",
    func: async (_event, ...args) => {
      const [sourceFolder, outputZipPath, password] = args;

      logger.log(
        `Received file.zip request for folder: ${sourceFolder}, output: ${outputZipPath.path}`,
      );
      const mainWindow = dataApp.getValue("mainWindow");
      if (!mainWindow) return "";

      const onProgress = (
        progress: number,
        filename: string,
        fileCount: number,
      ) => {
        mainWindow.webContents.send("zip-folder-data", {
          number: progress,
          filename,
          fileCount,
        });
      };
      const onError = (error: Error) => {
        mainWindow.webContents.send("zip-folder-data", null, error);
      };

      const result = await zipFolder(
        sourceFolder,
        outputZipPath,
        password,
        onProgress,
        onError,
      );

      return result;
    },
  },
};
