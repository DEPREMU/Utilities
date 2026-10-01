import { routerAdminPost } from "./post";
import { getRouterPerRoute } from "@common";

export const ROUTER_ADMIN = getRouterPerRoute("/admin", {
  POST: routerAdminPost,
});
