import { routerLogsGet } from "./get";
import { routerLogsPut } from "./put";
import { routerLogsPost } from "./post";
import { routerLogsDelete } from "./delete";
import { getRouterPerRoute } from "@common";

export const ROUTER_LOGS = getRouterPerRoute("/logs", {
  GET: routerLogsGet,
  PUT: routerLogsPut,
  POST: routerLogsPost,
  DELETE: routerLogsDelete,
});
