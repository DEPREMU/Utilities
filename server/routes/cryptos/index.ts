import { routerCryptosGet } from "./get";
import { getRouterPerRoute } from "@common";

export const ROUTER_CRYPTOS = getRouterPerRoute("/cryptos", {
  GET: routerCryptosGet,
});
