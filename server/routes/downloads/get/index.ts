import { getRouterGet } from "@common";
import { handleDownload, handleIsUpdateAvailable } from "./handlers";

export const routerDownloadsGet = getRouterGet("/downloads", {
  "/is-update-available/:version/:buildType": {
    handler: handleIsUpdateAvailable,
  },
  "/download/:id": {
    handler: handleDownload,
  },
});
