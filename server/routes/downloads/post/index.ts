import { handleUpload } from "./handlers";
import { getRouterPost } from "@common";

export const routerDownloadsPost = getRouterPost("/downloads", {
  "/upload": {
    handler: handleUpload,
  },
});
