import chalk from "chalk";
import { prisma } from "@/database/postgres";
import { Logger, STATUS_RESPONSE, getHandlerDelete } from "@common";

export const handleDeleteLog = getHandlerDelete(
  "/logs",
  "/:logId",
  { params: { logId: "string" } },
  async ({ params }, sendResponse) => {
    try {
      const { logId } = params;

      await prisma.logs.delete({
        where: { id: logId },
      });

      sendResponse(STATUS_RESPONSE.SUCCESS, { success: true });
    } catch (error) {
      Logger.error(chalk.red("Error deleting log:"), error);
      sendResponse(STATUS_RESPONSE.INTERNAL_SERVER_ERROR, {
        success: false,
        error: "An error occurred while deleting the log.",
      });
    }
  },
);
