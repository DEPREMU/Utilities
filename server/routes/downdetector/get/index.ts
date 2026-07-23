import { getRouterGet } from "@common";
import { handleGetDownDetector } from "./handlers";
import { authMiddleware } from "@/routes/auth/middlewares";

export const routerDownDetectorGet = getRouterGet("/down-detector", {
  "/:deviceId": {
    handler: handleGetDownDetector,
    middlewares: [authMiddleware],
  },
  "/:deviceId/:page-number-optional": {
    handler: handleGetDownDetector,
    middlewares: [authMiddleware],
  },
});
