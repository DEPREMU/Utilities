import { routerAuthPost } from "./post";
import { getRouterPerRoute } from "@common";

export const ROUTER_AUTH = getRouterPerRoute("/auth", {
  POST: routerAuthPost,
});
