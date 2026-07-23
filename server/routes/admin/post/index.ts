import { getRouterPost } from "@common";
import { authMiddleware } from "@/routes/auth/middlewares";
import { handlerAdminUnlock } from "./handlers";

export const routerAdminPost = getRouterPost("/admin", {
  "/unlock": {
    handler: handlerAdminUnlock,
    middlewares: [authMiddleware],
  },
});
