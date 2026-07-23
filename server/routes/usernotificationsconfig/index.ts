import { getRouterPerRoute } from "@common";
import { routerUserNotificationsConfigPut } from "./put";

export const ROUTER_USER_NOTIFICATIONS_CONFIG = getRouterPerRoute(
  "/user-notifications-config",
  { PUT: routerUserNotificationsConfigPut },
);
