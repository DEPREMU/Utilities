import { getRouterPerRoute } from "@common";
import { routerStreamersGet } from "./get";

export const ROUTER_STREAMERS = getRouterPerRoute("/streamers", {
  GET: routerStreamersGet,
});
