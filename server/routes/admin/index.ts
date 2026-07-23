import { getRouterPerRoute } from "@common";
import { routerAdminPost } from "./post";

export const ROUTER_ADMIN = getRouterPerRoute("/admin", {
  POST: routerAdminPost,
});
