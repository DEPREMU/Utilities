import { getRouterGet } from "@common";
import { authMiddlewareGet } from "@/routes/auth/middlewares";
import { handleGetClipboard } from "./handlers";

export const routerClipboardGet = getRouterGet("/clipboard", {
  "/:deviceId{/:lastId}": {
    handler: handleGetClipboard,
    middlewares: [authMiddlewareGet],
  },
});
