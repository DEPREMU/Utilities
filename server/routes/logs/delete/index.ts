import { authMiddleware } from "../middlewares/auth";
import { getRouterDelete } from "@common";
import { handleDeleteLog } from "./handlers";

export const routerLogsDelete = getRouterDelete("/logs", {
  "/:logId": { handler: handleDeleteLog, middlewares: [authMiddleware] },
});
