import { getRouterDelete } from "@common";
import { whatsappAuthMiddleware } from "../middlewares/auth";
import { handleUnlinkWhatsApp } from "./handlers";

export const routerWhatsAppDelete = getRouterDelete("/whatsapp", {
  "/link": {
    handler: handleUnlinkWhatsApp,
    middlewares: [whatsappAuthMiddleware],
  },
});
