import { getRouterPerRoute } from "@common";
import { routerClipboardGet } from "./get";
import { routerClipboardPut } from "./put";
import { routerClipboardPost } from "./post";

export const ROUTER_CLIPBOARD = getRouterPerRoute("/clipboard", {
  GET: routerClipboardGet,
  PUT: routerClipboardPut,
  POST: routerClipboardPost,
});
