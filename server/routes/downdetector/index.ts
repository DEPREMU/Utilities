import { getRouterPerRoute } from "@common";
import { routerDownDetectorPut } from "./put";
import { routerDownDetectorGet } from "./get";
import { routerDownDetectorPost } from "./post";
import { routerDownDetectorDelete } from "./delete";

export const ROUTER_DOWN_DETECTOR = getRouterPerRoute("/down-detector", {
  GET: routerDownDetectorGet,
  PUT: routerDownDetectorPut,
  POST: routerDownDetectorPost,
  DELETE: routerDownDetectorDelete,
});
