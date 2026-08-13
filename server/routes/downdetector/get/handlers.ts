import { prisma } from "@/database/postgres";
import { getHandlerGet, Helper, Logger, STATUS_RESPONSE } from "@common";

const PAGE_SIZE = 10;

export const handleGetDownDetector = getHandlerGet(
  "/down-detector",
  "/:deviceId{/:page}",
  {
    params: {
      page: ["number", "undefined"],
      deviceId: "string",
    },
  },
  async ({ params }, sendResponse, { req }) => {
    try {
      const page = Helper.Object.getValue(params, "page", 1);

      const res = await prisma.downDetector.findMany({
        take: PAGE_SIZE,
        skip: (page - 1) * PAGE_SIZE,
        where: { userId: req.user.token.data.userId },
        orderBy: { createdAt: "desc" },
      });

      sendResponse(STATUS_RESPONSE.SUCCESS, {
        downDetectors: res.map((i) =>
          Helper.Object.changeType(i, { createdAt: "string" }),
        ),
      });
    } catch (error) {
      Logger.error("Error while fetching downDetector items:", error);
      sendResponse(STATUS_RESPONSE.INTERNAL_SERVER_ERROR, {
        error: "An error occurred while fetching downDetector items.",
      });
    }
  },
);
