import { prisma } from "@/database/postgres";
import { getHandlerPost, Helper, STATUS_RESPONSE } from "@common";

export const handleAddClipboardItem = getHandlerPost(
  "/clipboard",
  "/add",
  async ({ body }, sendResponse, { req }) => {
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
  },
);
