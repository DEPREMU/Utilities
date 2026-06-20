import { routerAuthPost } from "./post";
import { getRouterPerRoute } from "@/routes/common";

export const ROUTER_AUTH = getRouterPerRoute("/auth", {
  POST: routerAuthPost,
});
