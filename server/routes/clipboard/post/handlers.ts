import { prisma } from "@/database/postgres";
import { getHandlerPost, Helper, Logger, STATUS_RESPONSE } from "@common";

export const handleAddClipboardItem = getHandlerPost(
  "/clipboard",
  "/add",
  async ({ body }, sendResponse, { req }) => {
    try {
      const res = await prisma.clipboardSync.create({
        data: {
          content: body.content,
          deviceId: body.deviceId,
          userId: req.user.token.data.userId,
        },
      });

      sendResponse(
        STATUS_RESPONSE.SUCCESS,
        Helper.Object.changeType(res, { createdAt: "string" }),
      );
    } catch (error) {
      Logger.error("Error adding clipboard item:", error);
      sendResponse(STATUS_RESPONSE.INTERNAL_SERVER_ERROR, {
        error: "Failed to add clipboard item",
      });
    }
  },
);
