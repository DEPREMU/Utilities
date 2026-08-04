import { getRouterGet } from "@common";
import { handleDownload, handleIsUpdateAvailable } from "./handlers";

export const routerUpdatesGet = getRouterGet("/updates", {
  "/is-update-available/:version/:buildType": {
    handler: handleIsUpdateAvailable,
  },
  "/download/:id": { handler: handleDownload },
});
