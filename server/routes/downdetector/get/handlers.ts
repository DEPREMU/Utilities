import { prisma } from "@/database/postgres";
import { getHandlerGet, Helper, STATUS_RESPONSE } from "@common";

const MAX_PAGE_SIZE = 100;
const DEFAULT_PAGE_SIZE = 20;

export const handleGetDownDetector = getHandlerGet(
  "/down-detector",
  "/:deviceId{/:lastId}",
  async ({ params, query }, sendResponse, { req }) => {
    const lastId = Helper.Object.getValue(params, "lastId");
    const take = Math.max(
      1,
      Math.min(
        MAX_PAGE_SIZE,
        Helper.Object.getValue(query, "pageSize", DEFAULT_PAGE_SIZE),
      ),
    );

    const res = await prisma.downDetector.findMany({
      take,
      skip: lastId ? 1 : 0,
      where: { userId: req.user.token.data.userId },
      cursor: lastId ? { id: lastId } : undefined,
      orderBy: [{ createdAt: "desc" }, { id: "desc" }],
    });

    sendResponse(STATUS_RESPONSE.SUCCESS, {
      downDetectors: res.map((i) =>
        Helper.Object.changeType(i, { createdAt: "string" }),
      ),
    });
  },
);
