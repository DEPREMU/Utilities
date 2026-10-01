import { prisma } from "@/database/postgres";
import { getEnvValue } from "@/env";
import { getHandlerPost, Logger, STATUS_RESPONSE } from "@common";
import { RequestError } from "@commonSrc/both/errors/Error";

export const handlerAdminUnlock = getHandlerPost(
  "/admin",
  "/unlock",
  async ({ body }, sendResponse, { req }) => {
    try {
      const jwt = req.user.token;

      const { password } = body;

      if (getEnvValue("ADMIN_PASSWORD") !== password) {
        throw new RequestError(
          STATUS_RESPONSE.UNAUTHORIZED,
          "Invalid password.",
        );
      }

      const res = await prisma.userConfig.update({
        data: { hasAdmin: true },
        where: { userId: jwt.data.userId },
        select: { hasAdmin: true },
      });

      if (!res.hasAdmin)
        throw new RequestError(
          STATUS_RESPONSE.INTERNAL_SERVER_ERROR,
          "Failed to unlock admin.",
        );

      sendResponse(STATUS_RESPONSE.SUCCESS, { success: true });
    } catch (error) {
      Logger.error("Error in admin unlock handler:", error);

      throw error;
    }
  },
);
