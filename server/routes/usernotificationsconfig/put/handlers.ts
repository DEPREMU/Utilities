import { prisma } from "@/database/postgres";
import { getHandlerPut, Logger, STATUS_RESPONSE } from "@common";

export const handleUpdateUserNotificationsConfig = getHandlerPut(
  "/user-notifications-config",
  "/update",
  {
    body: {
      match: "object",
      values: "object",
      deviceId: "string",
    },
  },
  async ({ body }, sendResponse, { req }) => {
    try {
      const updatedConfig = await prisma.userNotificationsConfig.updateMany({
        where: {
          ...body.match,
          userId: req.user.token.data.userId,
        },
        data: body.values,
      });

      sendResponse(STATUS_RESPONSE.SUCCESS, {
        error: updatedConfig.count > 0 ? undefined : "No config updated",
      });
    } catch (error) {
      Logger.error("Error while updating user notifications config:", error);
      sendResponse(STATUS_RESPONSE.INTERNAL_SERVER_ERROR, {
        error:
          "An error occurred while updating the user notifications config.",
      });
    }
  },
);
