import { handleUpload } from "./handlers";
import { getRouterPost } from "@/routes/common";

export const routerUpdatesPost = getRouterPost("/updates", {
  "/upload": { handler: handleUpload },
});
