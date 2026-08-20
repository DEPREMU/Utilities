import { getRouterGet } from "@common";
import { authMiddlewareGet } from "@/routes/auth/middlewares";
import { handleGetClipboard } from "./handlers";

export const routerClipboardGet = getRouterGet("/clipboard", {
  "/:deviceId{/:page}": {
    handler: handleGetClipboard,
    middlewares: [authMiddlewareGet],
  },
});
