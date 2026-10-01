import { prisma } from "@/database/postgres";
import { getHandlerPost, Helper, STATUS_RESPONSE } from "@common";

export const handleAddDownDetector = getHandlerPost(
  "/down-detector",
  "/add",
  async ({ body }, sendResponse, { req }) => {
    const res = await prisma.downDetector.create({
      data: { ...body.values, userId: req.user.token.data.userId },
    });

    sendResponse(
      STATUS_RESPONSE.SUCCESS,
      Helper.Object.changeType(res, { createdAt: "string" }),
    );
  },
);
