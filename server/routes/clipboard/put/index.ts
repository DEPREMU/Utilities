import {
  handleToggleDeletedAllClipboardItems,
  handleToggleDeletedClipboardItem,
} from "./handlers";
import { getRouterPut } from "@common";
import { authMiddlewarePost } from "@/routes/auth/middlewares";

export const routerClipboardPut = getRouterPut("/clipboard", {
  "/delete/toggle-deleted": {
    handler: handleToggleDeletedClipboardItem,
    middlewares: [authMiddlewarePost],
  },
  "/delete/toggle-deleted-all": {
    handler: handleToggleDeletedAllClipboardItems,
    middlewares: [authMiddlewarePost],
  },
});
