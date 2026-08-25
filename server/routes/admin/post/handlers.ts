import { prisma } from "@/database/postgres";
import { getEnvValue } from "@/env";
import { getHandlerPost, Logger, STATUS_RESPONSE } from "@common";

export const handlerAdminUnlock = getHandlerPost(
  "/admin",
  "/unlock",
  async ({ body }, sendResponse, { req }) => {
    try {
      const jwt = req.user.token;

      const { password } = body;

      if (getEnvValue("ADMIN_PASSWORD") !== password) {
        sendResponse(STATUS_RESPONSE.UNAUTHORIZED, {
          error: "Invalid password.",
        });
        return;
      }

      const res = await prisma.userConfig.update({
        data: { hasAdmin: true },
        where: { userId: jwt.data.userId },
        select: { hasAdmin: true },
      });

      sendResponse(STATUS_RESPONSE.SUCCESS, { success: res.hasAdmin });
    } catch (error) {
      Logger.error("Error in admin unlock handler:", error);
      sendResponse(STATUS_RESPONSE.INTERNAL_SERVER_ERROR, {
        error: "An error occurred while processing the request.",
      });
    }
  },
);
