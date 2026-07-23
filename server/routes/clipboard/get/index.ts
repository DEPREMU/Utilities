import { getRouterGet } from "@common";
import { handleGetClipboard, handleSearchClipboard } from "./handlers";
import { authMiddleware } from "@/routes/auth/middlewares";

export const routerClipboardGet = getRouterGet("/clipboard", {
  "/:deviceId": {
    handler: handleGetClipboard,
    middlewares: [authMiddleware],
  },
  "/:deviceId/:page-number-optional": {
    handler: handleGetClipboard,
    middlewares: [authMiddleware],
  },
  "/search/:deviceId/:deleted-boolean/:query-string/:page-number-optional": {
    handler: handleSearchClipboard,
    middlewares: [authMiddleware],
  },
  "/search/:deviceId/:deleted-boolean/:query-string": {
    handler: handleSearchClipboard,
    middlewares: [authMiddleware],
  },
});
