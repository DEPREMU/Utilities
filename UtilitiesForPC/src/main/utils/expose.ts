import { ipcMain } from "electron";
import { clipboardIpcHandlers } from "../ipc/clipboard";
import { pdfIpcHandlers } from "../ipc/pdf";
import { storageIpcHandlers } from "../ipc/storage";
import { vaultIpcHandlers } from "../ipc/vault";
import { fileIpcHandlers } from "../ipc/file";
import { systemIpcHandlers } from "../ipc/system";
import { notificationIpcHandlers } from "../ipc/notification";
import { networkIpcHandlers } from "../ipc/network";
import { IpcHandlerEntry } from "../ipc/types";

export const allIpcHandlers = {
  ...clipboardIpcHandlers,
  ...pdfIpcHandlers,
  ...storageIpcHandlers,
  ...vaultIpcHandlers,
  ...fileIpcHandlers,
  ...systemIpcHandlers,
  ...notificationIpcHandlers,
  ...networkIpcHandlers,
};

Object.entries(allIpcHandlers).forEach(([channel, handler]) => {
  const { type, func } = handler as IpcHandlerEntry;
  ipcMain?.[type]?.(channel, func as never);
});
