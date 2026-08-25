import { prisma } from "@/database/postgres";
import { getHandlerPut, Helper, Logger, STATUS_RESPONSE } from "@common";

export const handleToggleDeletedClipboardItem = getHandlerPut(
  "/clipboard",
  "/delete/toggle-deleted",
  async ({ body }, sendResponse, { req }) => {
    try {
      const id = Helper.Arrays.convertToArray(body.id);
      const userId = req.user.token.data.userId;

      const items = await prisma.clipboardSync.findMany({
        where: { id: { in: id }, userId },
      });

      if (!items.length) {
        sendResponse(STATUS_RESPONSE.NOT_FOUND, {
          error: "Item not found",
        });
        return;
      }

      const updatedItem = await prisma.clipboardSync.updateMany({
        data: {
          deleted:
            body.deleted !== undefined ? body.deleted : !items[0].deleted,
        },
        where: { id: { in: id }, userId },
      });

      sendResponse(STATUS_RESPONSE.SUCCESS, {
        error: updatedItem ? undefined : "Failed to toggle deleted status",
      });
    } catch (error) {
      Logger.error(
        "Error while toggling deleted status of clipboard item:",
        error,
      );
      sendResponse(STATUS_RESPONSE.INTERNAL_SERVER_ERROR, {
        error:
          "An error occurred while toggling the deleted status of the clipboard item.",
      });
    }
  },
);

export const handleToggleDeletedAllClipboardItems = getHandlerPut(
  "/clipboard",
  "/delete/toggle-deleted-all",
  async ({ body }, sendResponse, { req }) => {
    try {
      const updatedItems = await prisma.clipboardSync.updateMany({
        data: { deleted: !body.restore },
        where: { userId: req.user.token.data.userId },
      });

      sendResponse(STATUS_RESPONSE.SUCCESS, {
        error: updatedItems.count > 0 ? undefined : "No items updated",
      });
    } catch (error) {
      Logger.error(
        "Error while toggling deleted status of all clipboard items:",
        error,
      );
      sendResponse(STATUS_RESPONSE.INTERNAL_SERVER_ERROR, {
        error:
          "An error occurred while toggling the deleted status of all clipboard items.",
      });
    }
  },
);
