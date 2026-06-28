import { routerInfoGet } from "./get";
import { getRouterPerRoute } from "@common";

export const ROUTER_INFO = getRouterPerRoute("/info", {
  GET: routerInfoGet,
});
