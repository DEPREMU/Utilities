import { authMiddleware } from "@/routes/auth/middlewares";
import { getRouterDelete } from "@common";
import { handleDeleteDownDetector } from "./handlers";

export const routerDownDetectorDelete = getRouterDelete("/down-detector", {
  "/:deviceId/:downDetectorId": {
    handler: handleDeleteDownDetector,
    middlewares: [authMiddleware],
  },
});
