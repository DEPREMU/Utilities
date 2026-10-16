import {
  getPersonalStickerConfig,
  updatePersonalStickerConfig,
} from "../whatsapp/personalConfig";
import {
  connectPersonalWhatsApp,
  getPersonalWhatsAppStatus,
  disconnectPersonalWhatsApp,
  logoutAndPurgePersonalWhatsApp,
} from "../whatsapp/personalGateway";
import { IpcHandlersRecord } from "./types";

export const whatsappIpcHandlers: IpcHandlersRecord<
  | "whatsapp.connect"
  | "whatsapp.getStatus"
  | "whatsapp.getConfig"
  | "whatsapp.disconnect"
  | "whatsapp.updateConfig"
  | "whatsapp.logoutAndPurge"
> = {
  "whatsapp.connect": {
    type: "handle",
    func: async () => await connectPersonalWhatsApp(),
  },
  "whatsapp.disconnect": {
    type: "handle",
    func: async () => await disconnectPersonalWhatsApp(),
  },
  "whatsapp.logoutAndPurge": {
    type: "handle",
    func: async () => await logoutAndPurgePersonalWhatsApp(),
  },
  "whatsapp.getStatus": {
    type: "handle",
    func: async () => getPersonalWhatsAppStatus(),
  },
  "whatsapp.getConfig": {
    type: "handle",
    func: async () => await getPersonalStickerConfig(),
  },
  "whatsapp.updateConfig": {
    type: "handle",
    func: async (_event, config) => await updatePersonalStickerConfig(config),
  },
};
