import { getRouterPut } from "@common";
import { authMiddleware } from "@/routes/auth/middlewares";
import { handleUpdateUserConfig } from "./handlers";

export const routerUserConfigPut = getRouterPut("/user-config", {
  "/update": {
    handler: handleUpdateUserConfig,
    middlewares: [authMiddleware],
  },
});
