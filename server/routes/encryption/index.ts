import { getRouterPerRoute } from "@common";
import { routerEncryptionPost } from "./post";

export const ROUTER_ENCRYPTION = getRouterPerRoute("/encryption", {
  POST: routerEncryptionPost,
});
