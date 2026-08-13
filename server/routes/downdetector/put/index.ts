import { getRouterPut } from "@common";
import { authMiddlewarePost } from "@/routes/auth/middlewares";
import { handleUpdateDownDetector } from "./handlers";

export const routerDownDetectorPut = getRouterPut("/down-detector", {
  "/update": {
    handler: handleUpdateDownDetector,
    middlewares: [authMiddlewarePost],
  },
});
