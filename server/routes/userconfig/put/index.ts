import { getRouterPut } from "@common";
import { handleUpdateUserConfig } from "./handlers";
import { handleAuthMiddleware } from "@/routes/clipboard/middlewares/auth";

export const routerUserConfigPut = getRouterPut("/user-config", {
  "/update": {
    handler: handleUpdateUserConfig,
    middlewares: [handleAuthMiddleware],
  },
});
