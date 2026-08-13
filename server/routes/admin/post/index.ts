import { getRouterPost } from "@common";
import { handlerAdminUnlock } from "./handlers";
import { authMiddlewarePost } from "@/routes/auth/middlewares";

export const routerAdminPost = getRouterPost("/admin", {
  "/unlock": {
    handler: handlerAdminUnlock,
    middlewares: [authMiddlewarePost],
  },
});
