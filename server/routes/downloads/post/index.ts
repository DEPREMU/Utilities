import { handleUpload } from "./handlers";
import { getRouterPost } from "@common";
import { handleUploadMiddleware } from "./middlewares";

export const routerDownloadsPost = getRouterPost("/downloads", {
  "/upload": {
    handler: handleUpload,
    middlewares: [handleUploadMiddleware],
  },
});
