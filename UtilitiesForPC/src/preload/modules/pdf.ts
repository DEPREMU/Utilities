import { PdfBridge, PdfCreateRequest, PdfCreateResult } from "@types";
import { ipcRenderer, IpcRendererEvent } from "electron";
import { sendMessage } from "../utils/sendMessage";
import { sendLog } from "../utils/logger";

export const pdfBridge: PdfBridge = {
  create: async (
    request: PdfCreateRequest,
    onProgress?: (progress: number) => void,
  ): Promise<PdfCreateResult | null> => {
    const progressListener = (_event: IpcRendererEvent, progress: number) => {
      onProgress?.(progress);
    };

    ipcRenderer.on("create-pdf-progress", progressListener);

    try {
      return await sendMessage("invoke", "pdf.create", request);
    } catch (error) {
      sendLog("error", "Error creating PDF:", error);
      return null;
    } finally {
      ipcRenderer.removeListener("create-pdf-progress", progressListener);
    }
  },
};
