import { prisma } from "@/database/postgres";
import { getHandlerPut, Logger, STATUS_RESPONSE } from "@common";

export const handleUpdateUserConfig = getHandlerPut(
  "/user-config",
  "/update",
  {
    body: {
      values: "object",
      deviceId: "string",
    },
  },
  async ({ body }, sendResponse, { req }) => {
    try {
      const jwt = req.user.token;

      const res = await prisma.userConfig.update({
        data: body.values,
        where: { userId: jwt.data.userId },
      });

      sendResponse(STATUS_RESPONSE.SUCCESS, {
        error: res ? undefined : "Failed to update user config",
        success: !!res,
      });
    } catch (error) {
      Logger.error("Error updating user config:", error);
    }
  },
);
