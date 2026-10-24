import { prisma } from "@/database/postgres";
import { getHandlerGet, Helper, STATUS_RESPONSE } from "@common";

const MAX_PAGE_SIZE = 100;
const DEFAULT_PAGE_SIZE = 20;

export const handleGetClipboard = getHandlerGet(
  "/clipboard",
  "/:deviceId{/:lastId}",
  async ({ params, query }, sendResponse, { req }) => {
    const lastId = Helper.Object.getValue(params, "lastId");
    const deleted = !!query.deleted;
    const querySearch = Helper.Object.getValue(query, "query");
    const take = Math.max(
      1,
      Math.min(
        MAX_PAGE_SIZE,
        Helper.Object.getValue(query, "pageSize", DEFAULT_PAGE_SIZE),
      ),
    );

    const result = await prisma.clipboardSync.findMany({
      take,
      skip: lastId ? 1 : 0,
      cursor: lastId ? { id: lastId } : undefined,
      where: {
        deleted,
        userId: req.user.token.data.userId,
        content: { contains: querySearch },
      },
      orderBy: [{ createdAt: "desc" }, { id: "desc" }],
    });

    sendResponse(STATUS_RESPONSE.SUCCESS, {
      clipboardItems: result.map((i) =>
        Helper.Object.changeType(i, { createdAt: "string" }),
      ),
    });
  },
);
