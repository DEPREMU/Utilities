import { routerPostImages } from "./post";
import { getRouterPerRoute } from "../functions";

export const ROUTER_IMAGES = getRouterPerRoute("/images", {
  POST: routerPostImages,
});

export * from "./utils";
