import { getRouterGet } from "@common";
import { handleGetClipboard, handleSearchClipboard } from "./handlers";
import { authMiddlewareGet } from "@/routes/auth/middlewares";

export const routerClipboardGet = getRouterGet("/clipboard", {
  "/:deviceId{/:page}": {
    handler: handleGetClipboard,
    middlewares: [authMiddlewareGet],
  },
  "/search/:deviceId/:query{/:page}": {
    handler: handleSearchClipboard,
    middlewares: [authMiddlewareGet],
  },
});
