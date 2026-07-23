import { getRouterPerRoute } from "@common";
import { routerUserConfigPut } from "./put";

export const ROUTER_USER_CONFIG = getRouterPerRoute("/user-config", {
  PUT: routerUserConfigPut,
});
