import { REPLACERS } from "@common";
import { pdfBridge } from "./modules/pdf";
import { fileBridge } from "./modules/file";
import { vaultBridge } from "./modules/vault";
import { systemBridge } from "./modules/system";
import { contextBridge } from "electron";
import { networkBridge } from "./modules/network";
import { storageBridge } from "./modules/storage";
import { whatsappBridge } from "./modules/whatsapp";
import { clipboardBridge } from "./modules/clipboard";
import { ContextBridgeType } from "@types";
import { notificationBridge } from "./modules/notification";

const contextBridgeType: ContextBridgeType = {
  UtilitiesForPC: {
    pdf: pdfBridge,
    file: fileBridge,
    vault: vaultBridge,
    system: systemBridge,
    storage: storageBridge,
    network: networkBridge,
    whatsapp: whatsappBridge,
    clipboard: clipboardBridge,
    notification: notificationBridge,
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
