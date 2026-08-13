import { getRouterDelete } from "@common";
import { authMiddlewareGet } from "@/routes/auth/middlewares";
import { handleDeleteStreamerByUserId } from "./handlers";

export const routerStreamersDelete = getRouterDelete("/streamers", {
  "/:deviceId/:streamerId": {
    handler: handleDeleteStreamerByUserId,
    middlewares: [authMiddlewareGet],
  },
});
