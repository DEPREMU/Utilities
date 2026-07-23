import { prisma } from "@/database/postgres";
import { getHandlerGet, Helper, Logger, STATUS_RESPONSE } from "@common";

const PAGE_SIZE = 20;

export const handleGetClipboard = getHandlerGet(
  "/clipboard",
  "/:deviceId/:page-number-optional",
  { deviceId: "string", page: ["number", "undefined"] },
  async (body, sendResponse) => {
    const page = body.page ?? 1;

    try {
      const result = await prisma.clipboardSync.findMany({
        where: {
          deviceId: body.deviceId,
        },
        orderBy: {
          createdAt: "desc",
        },
        skip: (page - 1) * PAGE_SIZE,
        take: PAGE_SIZE,
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
  "/search/:deviceId/:deleted-boolean/:query-string/:page-number-optional",
  {
    page: ["number", "undefined"],
    query: "string",
    deleted: ["boolean", "undefined"],
    deviceId: "string",
  },
  async (body, sendResponse) => {
    const page = body.page ?? 1;
    const deleted = !!body.deleted;

    try {
      const result = await prisma.clipboardSync.findMany({
        where: {
          deleted,
          content: { contains: body.query },
        },
        skip: (page - 1) * PAGE_SIZE,
        take: PAGE_SIZE,
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
