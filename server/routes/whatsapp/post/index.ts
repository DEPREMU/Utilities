import { getRouterPost } from "@common";
import { whatsappAuthMiddleware } from "../middlewares/auth";
import { handleGenerateLink, handleAdminToggle } from "./handlers";

export const routerWhatsAppPost = getRouterPost("/whatsapp", {
  "/admin/toggle": {
    handler: handleAdminToggle,
    middlewares: [whatsappAuthMiddleware],
  },
  "/link/generate": {
    handler: handleGenerateLink,
    middlewares: [whatsappAuthMiddleware],
  },
});
