import { getRouterPost } from "@common";
import { handleAddStreamerByUserId } from "./handlers";
import { authMiddleware } from "@/routes/auth/middlewares";

export const routerStreamersPost = getRouterPost("/streamers", {
  "/add": {
    handler: handleAddStreamerByUserId,
    middlewares: [authMiddleware],
  },
});
