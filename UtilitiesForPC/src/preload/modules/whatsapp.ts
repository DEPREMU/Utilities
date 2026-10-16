import {
  WhatsAppBridge,
  PersonalWhatsAppStatus,
  PersonalStickerConfig,
  WhatsAppStatusListener,
} from "@types";
import { sendMessage } from "../utils/sendMessage";
import Electron, { ipcRenderer } from "electron";

export const whatsappBridge: WhatsAppBridge = {
  connect: async (): Promise<PersonalWhatsAppStatus> => {
    return await sendMessage("invoke", "whatsapp.connect");
  },
  disconnect: async (): Promise<boolean> => {
    return await sendMessage("invoke", "whatsapp.disconnect");
  },
  logoutAndPurge: async (): Promise<boolean> => {
    return await sendMessage("invoke", "whatsapp.logoutAndPurge");
  },
  getStatus: async (): Promise<PersonalWhatsAppStatus> => {
    return await sendMessage("invoke", "whatsapp.getStatus");
  },
  getConfig: async (): Promise<PersonalStickerConfig> => {
    return await sendMessage("invoke", "whatsapp.getConfig");
  },
  updateConfig: async (
    config: Partial<PersonalStickerConfig>,
  ): Promise<PersonalStickerConfig> => {
    return await sendMessage("invoke", "whatsapp.updateConfig", config);
  },
  onStatusChanged: (listener: WhatsAppStatusListener): (() => void) => {
    const handler = (
      _event: Electron.IpcRendererEvent,
      status: PersonalWhatsAppStatus,
    ) => {
      listener(status);
    };
    ipcRenderer?.on("whatsapp:personal:status-changed", handler);
    return () => {
      ipcRenderer?.removeListener("whatsapp:personal:status-changed", handler);
    };
  },
};
