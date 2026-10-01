import { prisma } from "@/database/postgres";
import { getHandlerGet, Helper, STATUS_RESPONSE } from "@common";

const PAGE_SIZE = 20;

export const handleGetClipboard = getHandlerGet(
  "/clipboard",
  "/:deviceId{/:page}",
  async ({ params, query }, sendResponse, { req }) => {
    const page = Helper.Object.getValue(params, "page", (v) =>
      typeof v === "number" && v > 0 ? v : 1,
    );
    const deleted = !!query.deleted;
    const querySearch = Helper.Object.getValue(query, "query");

    const result = await prisma.clipboardSync.findMany({
      skip: (page - 1) * PAGE_SIZE,
      take: PAGE_SIZE,
      where: {
        userId: req.user.token.data.userId,
        deleted,
        content: { contains: querySearch },
      },
      orderBy: { createdAt: "desc" },
    });

    sendResponse(STATUS_RESPONSE.SUCCESS, {
      clipboardItems: result.map((i) =>
        Helper.Object.changeType(i, { createdAt: "string" }),
      ),
    });
  },
);
