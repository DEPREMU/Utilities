import { getRouterDelete } from "@common";
import { authMiddlewareGet } from "@/routes/auth/middlewares";
import { handleDeleteDownDetector } from "./handlers";

export const routerDownDetectorDelete = getRouterDelete("/down-detector", {
  "/:deviceId/:downDetectorId": {
    handler: handleDeleteDownDetector,
    middlewares: [authMiddlewareGet],
  },
});
