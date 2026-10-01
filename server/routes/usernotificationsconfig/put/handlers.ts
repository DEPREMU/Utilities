import { prisma } from "@/database/postgres";
import { RequestError } from "@commonSrc/both/errors/Error";
import { getHandlerPut, STATUS_RESPONSE } from "@common";

export const handleUpdateUserNotificationsConfig = getHandlerPut(
  "/user-notifications-config",
  "/update",
  async ({ body }, sendResponse, { req }) => {
    const updatedConfig = await prisma.userNotificationsConfig.updateMany({
      where: {
        ...body.match,
        userId: req.user.token.data.userId,
      },
      data: body.values,
    });

    if (!updatedConfig.count)
      throw new RequestError(STATUS_RESPONSE.NOT_FOUND, "No config updated");

    sendResponse(STATUS_RESPONSE.SUCCESS, { success: true });
  },
);
