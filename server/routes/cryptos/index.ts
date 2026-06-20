import { routerCryptosGet } from "./get/index.ts";
import { getRouterPerRoute } from "@/routes/common.ts";

export const ROUTER_CRYPTOS = getRouterPerRoute("/cryptos", {
  GET: routerCryptosGet,
});
