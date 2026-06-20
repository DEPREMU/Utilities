import { handleDeleteLog } from "./handlers";
import { getRouterDelete } from "@/routes/common";

export const routerLogsDelete = getRouterDelete("/logs", {
  "/:logId": { handler: handleDeleteLog },
});
