import { getRouterPerRoute } from "@common";
import { routerStreamersGet } from "./get";
import { routerStreamersPost } from "./post";
import { routerStreamersDelete } from "./delete";

export const ROUTER_STREAMERS = getRouterPerRoute("/streamers", {
  GET: routerStreamersGet,
  POST: routerStreamersPost,
  DELETE: routerStreamersDelete,
});
