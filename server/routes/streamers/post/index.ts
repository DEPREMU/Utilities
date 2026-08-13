import { getRouterPost } from "@common";
import { authMiddlewarePost } from "@/routes/auth/middlewares";
import { handleAddStreamerByUserId } from "./handlers";

export const routerStreamersPost = getRouterPost("/streamers", {
  "/add": {
    handler: handleAddStreamerByUserId,
    middlewares: [authMiddlewarePost],
  },
});
