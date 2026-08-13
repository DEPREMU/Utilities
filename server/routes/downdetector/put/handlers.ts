import { prisma } from "@/database/postgres";
import { getHandlerPut, Logger, STATUS_RESPONSE } from "@common";

export const handleUpdateDownDetector = getHandlerPut(
  "/down-detector",
  "/update",
  {
    body: {
      id: "string",
      values: "object",
      deviceId: "string",
    },
  },
  async ({ body }, sendResponse, { req }) => {
    try {
      await prisma.downDetector.update({
        data: body.values,
        where: { id: body.id, userId: req.user.token.data.userId },
      });

      sendResponse(STATUS_RESPONSE.SUCCESS, {});
    } catch (error) {
      Logger.error("Error while updating downDetector item:", error);
      sendResponse(STATUS_RESPONSE.INTERNAL_SERVER_ERROR, {
        error: "An error occurred while updating the downDetector item.",
      });
    }
  },
);
