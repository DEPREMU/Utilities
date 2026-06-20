import { getRouterPerRoute } from "@/routes/common";
import { routerStreamersGet } from "./get";

export const ROUTER_STREAMERS = getRouterPerRoute("/streamers", {
  GET: routerStreamersGet,
});
