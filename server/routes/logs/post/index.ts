import { handleAddLog } from "./handlers";
import { getRouterPost } from "@common";

export const routerLogsPost = getRouterPost("/logs", {
  "/add": { handler: handleAddLog },
});
