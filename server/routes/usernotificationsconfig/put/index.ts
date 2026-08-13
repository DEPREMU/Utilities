import { getRouterPut } from "@common";
import { authMiddlewarePost } from "@/routes/auth/middlewares";
import { handleUpdateUserNotificationsConfig } from "./handlers";

export const routerUserNotificationsConfigPut = getRouterPut(
  "/user-notifications-config",
  {
    "/update": {
      handler: handleUpdateUserNotificationsConfig,
      middlewares: [authMiddlewarePost],
    },
  },
);
