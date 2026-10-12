import { prisma } from "@/database/postgres";
import { getHandlerDelete, Logger, STATUS_RESPONSE } from "@common";

const logger = new Logger("DownDetectorDelete");

export const handleDeleteDownDetector = getHandlerDelete(
  "/down-detector",
  "/:deviceId/:downDetectorId",
  async ({ params }, sendResponse, { req }) => {
    try {
      const deletedItem = await prisma.downDetector.delete({
        where: {
          id: params.downDetectorId,
          userId: req.user.token.data.userId,
        },
      });

      sendResponse(STATUS_RESPONSE.SUCCESS, {
        error: deletedItem ? undefined : "Failed to delete downDetector item",
        success: !!deletedItem,
      });
    } catch (error) {
      logger.error("Error while deleting downDetector item:", error);
      sendResponse(STATUS_RESPONSE.INTERNAL_SERVER_ERROR, {
        error: "An error occurred while deleting the downDetector item.",
        success: false,
      });
    }
  },
);
