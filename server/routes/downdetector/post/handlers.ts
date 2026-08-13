import { prisma } from "@/database/postgres";
import { getHandlerPost, Helper, Logger, STATUS_RESPONSE } from "@common";

export const handleAddDownDetector = getHandlerPost(
  "/down-detector",
  "/add",
  {
    body: {
      values: "object",
      deviceId: "string",
    },
  },
  async ({ body }, sendResponse, { req }) => {
    try {
      const res = await prisma.downDetector.create({
        data: { ...body.values, userId: req.user.token.data.userId },
      });

      sendResponse(
        STATUS_RESPONSE.SUCCESS,
        Helper.Object.changeType(res, { createdAt: "string" }),
      );
    } catch (error) {
      Logger.error("Error while adding downDetector item:", error);
      sendResponse(STATUS_RESPONSE.INTERNAL_SERVER_ERROR, {
        error: "An error occurred while adding the downDetector item.",
      });
    }
  },
);
