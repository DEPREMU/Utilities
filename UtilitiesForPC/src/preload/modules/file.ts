import { FileBridge, FileInfo } from "@types";
import { ipcRenderer } from "electron";
import { sendMessage } from "../utils/sendMessage";
import { sendLog } from "../utils/logger";

export const fileBridge: FileBridge = {
  copyToTemp: async (base64: string, fileName: string) => {
    try {
      return await sendMessage("invoke", "file.copyToTemp", base64, fileName);
    } catch (error) {
      sendLog("error", "Error copying file to temp:", error);
      return { success: false };
    }
  },
  remove: async (uri: string) => {
    try {
      return await sendMessage("invoke", "file.remove", uri);
    } catch (error) {
      sendLog("error", "Error removing file from temp:", error);
      return { success: false };
    }
  },
  pickFolder: async (): Promise<"canceled" | string> => {
    try {
      return await sendMessage("invoke", "file.pickFolder");
    } catch (error) {
      sendLog("error", "Error picking folder:", error);
      return "canceled";
    }
  },
  getInfo: async (filePath: string): Promise<FileInfo | null> => {
    try {
      return await sendMessage("invoke", "file.getInfo", filePath);
    } catch (error) {
      sendLog("error", `Error getting file info for "${filePath}":`, error);
      return null;
    }
  },
  askPath: async (): Promise<string | null> => {
    try {
      return await sendMessage("invoke", "file.askPath");
    } catch (error) {
      sendLog("error", "Error asking path:", error);
      return null;
    }
  },
  zip: async (
    files: string[],
    outputPath: { folderName: string; path: string },
    password?: string,
    onProgress?: (progress: number, filename: string, fileCount: number) => void,
    onError?: (error: Error) => void,
  ): Promise<string> => {
    try {
      ipcRenderer.on(
        "zip-folder-data",
        (
          _event,
          progress: { number: number; filename: string; fileCount: number } | null,
          error: Error | null,
        ) => {
          if (error) onError?.(error);
          if (progress)
            onProgress?.(progress.number, progress.filename, progress.fileCount);
        },
      );
      const result = await sendMessage(
        "invoke",
        "file.zip",
        files,
        outputPath,
        password,
      );
      ipcRenderer.removeAllListeners("zip-folder-data");

      return result;
    } catch (error) {
      sendLog("error", "Error zipping folder:", error);
      ipcRenderer.removeAllListeners("zip-folder-data");
      return "";
    }
  },
};
