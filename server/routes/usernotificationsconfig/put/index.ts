import { getRouterPut } from "@common";
import { handleUpdateUserNotificationsConfig } from "./handlers";
import { authMiddleware } from "@/routes/auth/middlewares";

export const routerUserNotificationsConfigPut = getRouterPut(
  "/user-notifications-config",
  {
    "/update": {
      handler: handleUpdateUserNotificationsConfig,
      middlewares: [authMiddleware],
    },
  },
);
