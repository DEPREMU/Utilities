import { getRouterPerRoute } from "@/routes/common";
import { routerEncryptionPost } from "./post";

export const ROUTER_ENCRYPTION = getRouterPerRoute("/encryption", {
  POST: routerEncryptionPost,
});
