import { prisma } from "@/database/postgres";
import { getHandlerGet, Helper, Logger, STATUS_RESPONSE } from "@common";

const PAGE_SIZE = 20;

export const handleGetClipboard = getHandlerGet(
  "/clipboard",
  "/:deviceId{/:page}",
  {
    params: {
      deviceId: "string",
      page: ["number", "undefined"],
    },
  },
  async ({ params }, sendResponse) => {
    const page = Helper.Object.getValue(params, "page", 1);

    try {
      const result = await prisma.clipboardSync.findMany({
        skip: (page - 1) * PAGE_SIZE,
        take: PAGE_SIZE,
        where: { deviceId: params.deviceId },
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

export const handleSearchClipboard = getHandlerGet(
  "/clipboard",
  "/search/:deviceId/:query{/:page}",
  {
    params: {
      page: ["number", "undefined"],
      query: ["string", "undefined"],
      deviceId: "string",
    },
    query: {
      deleted: ["boolean", "undefined"],
    },
  },
  async ({ params, query }, sendResponse) => {
    const page = Helper.Object.getValue(params, "page", 1);
    const deleted = !!query.deleted;

    try {
      const result = await prisma.clipboardSync.findMany({
        skip: (page - 1) * PAGE_SIZE,
        take: PAGE_SIZE,
        where: { deleted, content: { contains: params.query } },
        orderBy: { createdAt: "desc" },
      });

      sendResponse(STATUS_RESPONSE.SUCCESS, {
        clipboardItems: result.map((i) =>
          Helper.Object.changeType(i, { createdAt: "string" }),
        ),
      });
    } catch (error) {
      Logger.error("Error while searching clipboard items:", error);
      sendResponse(STATUS_RESPONSE.INTERNAL_SERVER_ERROR, {
        error: "An error occurred while searching clipboard items.",
      });
    }
  },
);
