import { getRouterGet } from "@common";
import { whatsappAuthMiddleware } from "../middlewares/auth";
import {
  handleWhatsAppHealth,
  handleWhatsAppStatus,
  handleWhatsAppQuota,
} from "./handlers";

export const routerWhatsAppGet = getRouterGet("/whatsapp", {
  "/health": { handler: handleWhatsAppHealth },
  "/status": {
    handler: handleWhatsAppStatus,
    middlewares: [whatsappAuthMiddleware],
  },
  "/quota": {
    handler: handleWhatsAppQuota,
    middlewares: [whatsappAuthMiddleware],
  },
});
