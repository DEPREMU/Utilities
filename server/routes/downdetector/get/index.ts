import { getRouterGet } from "@common";
import { authMiddlewareGet } from "@/routes/auth/middlewares";
import { handleGetDownDetector } from "./handlers";

export const routerDownDetectorGet = getRouterGet("/down-detector", {
  "/:deviceId{/:lastId}": {
    handler: handleGetDownDetector,
    middlewares: [authMiddlewareGet],
  },
});
