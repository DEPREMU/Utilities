import { getRouterPut } from "@common";
import { authMiddleware } from "@/routes/auth/middlewares";
import { handleUpdateDownDetector } from "./handlers";

export const routerDownDetectorPut = getRouterPut("/down-detector", {
  "/update": {
    handler: handleUpdateDownDetector,
    middlewares: [authMiddleware],
  },
});
