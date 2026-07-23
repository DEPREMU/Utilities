import { prisma } from "@/database/postgres";
import { getHandlerDelete, Logger, STATUS_RESPONSE } from "@common";

export const handleDeleteStreamerByUserId = getHandlerDelete(
  "/streamers",
  "/:deviceId/:streamerId",
  {
    deviceId: "string",
    streamerId: "string",
  },
  async (body, sendResponse, { req }) => {
    try {
      const { streamerId } = body;

      const res = await prisma.userStreamers.delete({
        where: {
          userId_streamerId: {
            userId: req.user.token.data.userId,
            streamerId: streamerId,
          },
        },
      });

      sendResponse(STATUS_RESPONSE.SUCCESS, {
        error: res ? undefined : "Failed to delete streamer",
        success: !!res,
      });
    } catch (error) {
      Logger.error("Error deleting streamer by user ID:", error);
      sendResponse(STATUS_RESPONSE.INTERNAL_SERVER_ERROR, {
        error: "An error occurred while deleting the streamer.",
        success: false,
      });
    }
  },
);
