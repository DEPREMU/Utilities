import { prisma } from "@/database/postgres";
import { getHandlerPut, STATUS_RESPONSE } from "@common";

export const handleUpdateDownDetector = getHandlerPut(
  "/down-detector",
  "/update",
  async ({ body }, sendResponse, { req }) => {
    await prisma.downDetector.update({
      data: body.values,
      where: { id: body.id, userId: req.user.token.data.userId },
    });

    sendResponse(STATUS_RESPONSE.SUCCESS, { success: true });
  },
);
