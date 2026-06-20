import { routerInfoGet } from "./get";
import { getRouterPerRoute } from "@/routes/common";

export const ROUTER_INFO = getRouterPerRoute("/info", {
  GET: routerInfoGet,
});
