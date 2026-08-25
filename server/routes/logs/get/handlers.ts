import { prisma } from "@/database/postgres";
import { getHandlerGet, Helper, STATUS_RESPONSE } from "@common";

export const handleGetLogs = getHandlerGet(
  "/logs",
  "/",
  async (_, sendResponse) => {
    try {
      const logs = await prisma.logs.findMany({
        orderBy: { timestamp: "desc" },
      });

      sendResponse(STATUS_RESPONSE.SUCCESS, {
        logs: logs.map((log) =>
          Helper.Object.changeType(log, { timestamp: "string" }),
        ),
      });
    } catch {
      sendResponse(STATUS_RESPONSE.INTERNAL_SERVER_ERROR, {
        error: "Failed to fetch logs",
      });
    }
  },
);

const LOGS_PER_PAGE = 10;

export const handleGetLogsPage = getHandlerGet(
  "/logs",
  "/page{/:page}",
  async ({ params }, sendResponse) => {
    try {
      const page = Helper.Object.getValue(params, "page", 1);
      const skip = (page - 1) * LOGS_PER_PAGE;

      const logs = await prisma.logs.findMany({
        skip,
        take: LOGS_PER_PAGE,
        orderBy: { timestamp: "desc" },
      });

      sendResponse(STATUS_RESPONSE.SUCCESS, {
        logs: logs.map((log) =>
          Helper.Object.changeType(log, { timestamp: "string" }),
        ),
      });
    } catch {
      sendResponse(STATUS_RESPONSE.INTERNAL_SERVER_ERROR, {
        error: "Failed to fetch logs",
      });
    }
  },
);
