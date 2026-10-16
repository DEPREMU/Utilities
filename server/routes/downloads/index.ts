import rateLimit from "express-rate-limit";
import { routerDownloadsGet } from "./get";
import { routerDownloadsPost } from "./post";
import { REPLACERS, getRouterPerRoute } from "@common";

export const ROUTER_DOWNLOADS = getRouterPerRoute(
  "/downloads",
  {
    GET: routerDownloadsGet,
    POST: routerDownloadsPost,
  },
  (router) => {
    router.use(
      "/downloads",
      rateLimit({
        windowMs: 10 * 60 * 1000,
        limit: !REPLACERS.isDev ? 200 : Infinity,
      }),
    );
  },
);
