import chalk from "chalk";
import { Logger } from "@common";
import { prisma } from "@/database/postgres";
import { getHandlerDelete } from "@/functions/getHandlerDelete";

export const handleDeleteLog = getHandlerDelete(
  "/logs",
  "/:logId",
  { logId: "string" },
  async (params, sendResponse) => {
    try {
      const { logId } = params;

      await prisma.logs.delete({
        where: { id: logId },
      });

      sendResponse("SUCCESS", { success: true });
    } catch (error) {
      Logger.error(chalk.red("Error deleting log:"), error);
      sendResponse("INTERNAL_SERVER_ERROR", {
        success: false,
        error: "An error occurred while deleting the log.",
      });
    }
  },
);
