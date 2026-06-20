import { getRouterGet } from "@/routes/common";
import { handleDownload, handleIsUpdateAvailable } from "./handlers";

export const routerUpdatesGet = getRouterGet("/updates", {
  "/is-update-available/:version/:buildType": {
    handler: handleIsUpdateAvailable,
  },
  "/is-update-available/:version/:buildType/:platform-optional": {
    handler: handleIsUpdateAvailable,
  },
  "/download/:id": { handler: handleDownload },
});
