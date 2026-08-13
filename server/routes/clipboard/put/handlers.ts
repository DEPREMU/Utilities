import { prisma } from "@/database/postgres";
import { getHandlerPut, Logger, STATUS_RESPONSE } from "@common";

export const handleToggleDeletedClipboardItem = getHandlerPut(
  "/clipboard",
  "/delete/toggle-deleted",
  { body: { deviceId: "string", id: "string" } },
  async ({ body }, sendResponse) => {
    try {
      const item = await prisma.clipboardSync.findUnique({
        where: { id: body.id },
      });

      if (!item) {
        sendResponse(STATUS_RESPONSE.NOT_FOUND, {
          error: "Item not found",
        });
        return;
      }

      const updatedItem = await prisma.clipboardSync.update({
        data: {
          deleted: body.deleted !== undefined ? body.deleted : !item.deleted,
        },
        where: { id: body.id },
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
  { body: { deviceId: "string", restore: "boolean" } },
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
