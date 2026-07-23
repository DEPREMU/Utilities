import { prisma } from "@/database/postgres";
import { getHandlerDelete, Logger, STATUS_RESPONSE } from "@common";

export const handleDeleteDownDetector = getHandlerDelete(
  "/down-detector",
  "/:deviceId/:downDetectorId",
  {
    deviceId: "string",
    downDetectorId: "string",
  },
  async (body, sendResponse, { req }) => {
    try {
      const deletedItem = await prisma.downDetector.delete({
        where: {
          id: body.downDetectorId,
          userId: req.user.token.data.userId,
        },
      });

      sendResponse(STATUS_RESPONSE.SUCCESS, {
        error: deletedItem ? undefined : "Failed to delete downDetector item",
        success: !!deletedItem,
      });
    } catch (error) {
      Logger.error("Error while deleting downDetector item:", error);
      sendResponse(STATUS_RESPONSE.INTERNAL_SERVER_ERROR, {
        error: "An error occurred while deleting the downDetector item.",
        success: false,
      });
    }
  },
);
