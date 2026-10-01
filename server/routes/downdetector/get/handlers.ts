import { prisma } from "@/database/postgres";
import { getHandlerGet, Helper, STATUS_RESPONSE } from "@common";

const PAGE_SIZE = 10;

export const handleGetDownDetector = getHandlerGet(
  "/down-detector",
  "/:deviceId{/:page}",
  async ({ params }, sendResponse, { req }) => {
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
  },
);
