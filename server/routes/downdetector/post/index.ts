import { getRouterPost } from "@common";
import { handleAddDownDetector } from "./handlers";
import { authMiddleware } from "@/routes/auth/middlewares";

export const routerDownDetectorPost = getRouterPost("/down-detector", {
  "/add": {
    handler: handleAddDownDetector,
    middlewares: [authMiddleware],
  },
});
