import { ContextBridgeType } from "@types";
import { contextBridge } from "electron";
import { REPLACERS } from "@common";
import { clipboardBridge } from "./modules/clipboard";
import { pdfBridge } from "./modules/pdf";
import { storageBridge } from "./modules/storage";
import { vaultBridge } from "./modules/vault";
import { fileBridge } from "./modules/file";
import { systemBridge } from "./modules/system";
import { notificationBridge } from "./modules/notification";
import { networkBridge } from "./modules/network";

const contextBridgeType: ContextBridgeType = {
  UtilitiesForPC: {
    clipboard: clipboardBridge,
    pdf: pdfBridge,
    storage: storageBridge,
    vault: vaultBridge,
    file: fileBridge,
    system: systemBridge,
    notification: notificationBridge,
    network: networkBridge,
  },
};

Object.entries(contextBridgeType).forEach(([key, value]) => {
  contextBridge.exposeInMainWorld(key, value);
});

if (REPLACERS.isDev)
  import("@common").then((common) => {
    const windowRef = window as unknown as Record<string, unknown>;
    windowRef.common = common;
  });
