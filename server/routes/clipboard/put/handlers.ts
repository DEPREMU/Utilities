import { prisma } from "@/database/postgres";
import { RequestError } from "@commonSrc/both/errors/Error";
import { getHandlerPut, Helper, STATUS_RESPONSE } from "@common";

export const handleToggleDeletedClipboardItem = getHandlerPut(
  "/clipboard",
  "/delete/toggle-deleted",
  async ({ body }, sendResponse, { req }) => {
    const id = Helper.Arrays.convertToArray(body.id);
    const userId = req.user.token.data.userId;

    const items = await prisma.clipboardSync.findMany({
      where: { id: { in: id }, userId },
    });

    if (!items.length)
      throw new RequestError(STATUS_RESPONSE.NOT_FOUND, "Item not found");

    const updatedItem = await prisma.clipboardSync.updateMany({
      data: {
        deleted: body.deleted !== undefined ? body.deleted : !items[0].deleted,
      },
      where: { id: { in: id }, userId },
    });

    if (updatedItem.count > 0) return;

    throw new RequestError(
      STATUS_RESPONSE.NOT_FOUND,
      "Failed to toggle deleted status",
    );
  },
);

export const handleToggleDeletedAllClipboardItems = getHandlerPut(
  "/clipboard",
  "/delete/toggle-deleted-all",
  async ({ body }, sendResponse, { req }) => {
    const updatedItems = await prisma.clipboardSync.updateMany({
      data: { deleted: !body.restore },
      where: { userId: req.user.token.data.userId },
    });

    if (updatedItems.count === 0)
      throw new RequestError(
        STATUS_RESPONSE.NOT_FOUND,
        "Failed to toggle deleted status",
      );

    sendResponse(STATUS_RESPONSE.SUCCESS, {
      success: true,
    });
  },
);
