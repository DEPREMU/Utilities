import { routerDevPost } from "./post";
import { getRouterPerRoute } from "@common";

export const ROUTER_DEV = getRouterPerRoute("/dev", {
  POST: routerDevPost,
});
