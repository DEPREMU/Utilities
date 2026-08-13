import { getRouterPost } from "@common";
import { authMiddlewarePost } from "@/routes/auth/middlewares";
import { handleAddDownDetector } from "./handlers";

export const routerDownDetectorPost = getRouterPost("/down-detector", {
  "/add": {
    handler: handleAddDownDetector,
    middlewares: [authMiddlewarePost],
  },
});
