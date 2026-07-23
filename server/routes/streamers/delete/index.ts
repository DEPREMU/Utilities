import { authMiddleware } from "@/routes/auth/middlewares";
import { getRouterDelete } from "@common";
import { handleDeleteStreamerByUserId } from "./handlers";

export const routerStreamersDelete = getRouterDelete("/streamers", {
  "/:deviceId/:streamerId": {
    handler: handleDeleteStreamerByUserId,
    middlewares: [authMiddleware],
  },
});
