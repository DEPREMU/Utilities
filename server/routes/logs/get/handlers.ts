import { prisma } from "@/database/postgres";
import { getHandlerGet } from "@common";

export const handleGetLogs = getHandlerGet(
  "/logs",
  "/",
  {} as never,
  async (_, sendResponse) => {
    try {
      const logs = await prisma.logs.findMany({
        orderBy: { timestamp: "desc" },
      });

      sendResponse("SUCCESS", { logs });
    } catch {
      sendResponse("INTERNAL_SERVER_ERROR", {
        error: "Failed to fetch logs",
      });
    }
  },
);

const LOGS_PER_PAGE = 10;

export const handleGetLogsPage = getHandlerGet(
  "/logs",
  "/page/:page-number-optional",
  { page: ["number", "undefined"] },
  async (params, sendResponse) => {
    try {
      const page = params.page || 1;
      const skip = (page - 1) * LOGS_PER_PAGE;

      const logs = await prisma.logs.findMany({
        skip,
        take: LOGS_PER_PAGE,
        orderBy: { timestamp: "desc" },
      });

      sendResponse("SUCCESS", { logs });
    } catch {
      sendResponse("INTERNAL_SERVER_ERROR", {
        error: "Failed to fetch logs",
      });
    }
  },
);
