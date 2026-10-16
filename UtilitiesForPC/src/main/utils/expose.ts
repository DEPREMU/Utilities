import { ipcMain } from "electron";
import { pdfIpcHandlers } from "../ipc/pdf";
import { fileIpcHandlers } from "../ipc/file";
import { IpcHandlerEntry } from "../ipc/types";
import { vaultIpcHandlers } from "../ipc/vault";
import { systemIpcHandlers } from "../ipc/system";
import { storageIpcHandlers } from "../ipc/storage";
import { networkIpcHandlers } from "../ipc/network";
import { whatsappIpcHandlers } from "../ipc/whatsapp";
import { clipboardIpcHandlers } from "../ipc/clipboard";
import { notificationIpcHandlers } from "../ipc/notification";

export const allIpcHandlers = {
  ...pdfIpcHandlers,
  ...fileIpcHandlers,
  ...vaultIpcHandlers,
  ...systemIpcHandlers,
  ...storageIpcHandlers,
  ...networkIpcHandlers,
  ...whatsappIpcHandlers,
  ...clipboardIpcHandlers,
  ...notificationIpcHandlers,
};

Object.entries(allIpcHandlers).forEach(([channel, handler]) => {
  const { type, func } = handler as IpcHandlerEntry;
  ipcMain?.[type]?.(channel, func as never);
});
