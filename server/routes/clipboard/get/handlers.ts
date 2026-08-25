import { prisma } from "@/database/postgres";
import { getHandlerGet, Helper, Logger, STATUS_RESPONSE } from "@common";

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

    try {
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
        clipboardItems: result.map((i) => ({
          ...i,
          createdAt: i.createdAt.toISOString(),
        })),
      });
    } catch (error) {
      Logger.error("Error while fetching clipboard items:", error);
      sendResponse(STATUS_RESPONSE.INTERNAL_SERVER_ERROR, {
        error: "An error occurred while fetching clipboard items.",
      });
    }
  },
);
