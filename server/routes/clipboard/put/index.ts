import {
  handleToggleDeletedAllClipboardItems,
  handleToggleDeletedClipboardItem,
} from "./handlers";
import { getRouterPut } from "@common";
import { authMiddleware } from "@/routes/auth/middlewares";

export const routerClipboardPut = getRouterPut("/clipboard", {
  "/delete/toggle-deleted": {
    handler: handleToggleDeletedClipboardItem,
    middlewares: [authMiddleware],
  },
  "/delete/toggle-deleted-all": {
    handler: handleToggleDeletedAllClipboardItems,
    middlewares: [authMiddleware],
  },
});
