import { routerLogsGet } from "./get";
import { routerLogsPost } from "./post";
import { routerLogsDelete } from "./delete";
import { getRouterPerRoute } from "@common";

export const ROUTER_LOGS = getRouterPerRoute("/logs", {
  GET: routerLogsGet,
  POST: routerLogsPost,
  DELETE: routerLogsDelete,
});
