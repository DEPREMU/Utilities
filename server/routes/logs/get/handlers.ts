import { prisma } from "@/database/postgres";
import { getHandlerGet, Helper, STATUS_RESPONSE } from "@common";

export const handleGetLogs = getHandlerGet(
  "/logs",
  "/",
  async (_, sendResponse) => {
    const logs = await prisma.logs.findMany({
      orderBy: { timestamp: "desc" },
    });

    sendResponse(STATUS_RESPONSE.SUCCESS, {
      logs: logs.map((log) =>
        Helper.Object.changeType(log, { timestamp: "string" }),
      ),
    });
  },
);

const MAX_PAGE_SIZE = 100;
const DEFAULT_PAGE_SIZE = 20;

export const handleGetLogsPage = getHandlerGet(
  "/logs",
  "/page{/:lastId}",
  async ({ params, query }, sendResponse) => {
    const lastId = Helper.Object.getValue(params, "lastId");
    const take = Math.max(
      1,
      Math.min(
        MAX_PAGE_SIZE,
        Helper.Object.getValue(query, "pageSize", DEFAULT_PAGE_SIZE),
      ),
    );

    const logs = await prisma.logs.findMany({
      take,
      skip: lastId ? 1 : 0,
      cursor: lastId ? { id: lastId } : undefined,
      orderBy: [{ timestamp: "desc" }, { id: "desc" }],
    });

    sendResponse(STATUS_RESPONSE.SUCCESS, {
      logs: logs.map((log) =>
        Helper.Object.changeType(log, { timestamp: "string" }),
      ),
    });
  },
);
