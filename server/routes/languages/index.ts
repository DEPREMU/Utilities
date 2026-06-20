import { getRouterPerRoute } from "@/routes/common";
import { routerLanguagesPost } from "./post";

export const ROUTER_LANGUAGES = getRouterPerRoute("/languages", {
  POST: routerLanguagesPost,
});
