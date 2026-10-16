import { getRouterPerRoute } from "@common";
import { routerWhatsAppGet } from "./get";
import { routerWhatsAppPost } from "./post";
import { routerWhatsAppDelete } from "./delete";

export const ROUTER_WHATSAPP = getRouterPerRoute("/whatsapp", {
  GET: routerWhatsAppGet,
  POST: routerWhatsAppPost,
  DELETE: routerWhatsAppDelete,
});
