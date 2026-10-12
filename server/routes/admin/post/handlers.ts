import chalk from "chalk";
import { prisma } from "@/database/postgres";
import { getEnvValue } from "@/env";
import { RequestError } from "@commonSrc/both/errors/Error";
import { Logger, getHandlerPost, STATUS_RESPONSE } from "@common";

const logger = new Logger("AdminPost");

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
      logger.error(chalk.red("Error in admin unlock handler:"), error);

      throw error;
    }
  },
);
