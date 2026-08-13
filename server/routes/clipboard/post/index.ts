import { getRouterPost } from "@common";
import { authMiddlewarePost } from "@/routes/auth/middlewares";
import { handleAddClipboardItem } from "./handlers";

export const routerClipboardPost = getRouterPost("/clipboard", {
  "/add": {
    handler: handleAddClipboardItem,
    middlewares: [authMiddlewarePost],
  },
});
