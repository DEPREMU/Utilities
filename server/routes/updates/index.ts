import rateLimit from "express-rate-limit";
import { REPLACERS } from "@/config";
import { routerUpdatesGet } from "./get";
import { routerUpdatesPost } from "./post";
import { getRouterPerRoute } from "@common";

export const ROUTER_UPDATES = getRouterPerRoute(
  "/updates",
  {
    GET: routerUpdatesGet,
    POST: routerUpdatesPost,
  },
  (router) => {
    router.use(
      "/updates",
      rateLimit({
        windowMs: 10 * 60 * 1000,
        limit: !REPLACERS.isDev ? 200 : Infinity,
      }),
    );
  },
);
