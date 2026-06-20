import { getRouterPost } from "@/routes/common";
import { handleAddLog } from "./handlers";

export const routerLogsPost = getRouterPost("/logs", {
  "/add": {
    handler: handleAddLog,
  },
});
