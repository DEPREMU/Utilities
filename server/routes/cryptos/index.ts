import { routerCryptosGet } from "./get/index.ts";
import { getRouterPerRoute } from "@common";

export const ROUTER_CRYPTOS = getRouterPerRoute("/cryptos", {
  GET: routerCryptosGet,
});
