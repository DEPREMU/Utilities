import { getRouterPost } from "@common";
import { handleAddClipboardItem } from "./handlers";
import { authMiddleware } from "@/routes/auth/middlewares";

export const routerClipboardPost = getRouterPost("/clipboard", {
  "/add": {
    handler: handleAddClipboardItem,
    middlewares: [authMiddleware],
  },
});
