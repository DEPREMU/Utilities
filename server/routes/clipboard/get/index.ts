import { getRouterGet } from "@common";
import { handleAuthMiddleware } from "../middlewares/auth";
import { handleGetClipboard, handleSearchClipboard } from "./handlers";

export const routerClipboardGet = getRouterGet("/clipboard", {
  "/:deviceId": {
    handler: handleGetClipboard,
    middlewares: [handleAuthMiddleware],
  },
  "/:deviceId/:page-number-optional": {
    handler: handleGetClipboard,
    middlewares: [handleAuthMiddleware],
  },
  "/search/:deviceId/:deleted-boolean/:query-string/:page-number-optional": {
    handler: handleSearchClipboard,
    middlewares: [handleAuthMiddleware],
  },
  "/search/:deviceId/:deleted-boolean/:query-string": {
    handler: handleSearchClipboard,
    middlewares: [handleAuthMiddleware],
  },
});
