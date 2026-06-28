import { handleUpload } from "./handlers";
import { getRouterPost } from "@common";

export const routerUpdatesPost = getRouterPost("/updates", {
  "/upload": { handler: handleUpload },
});
