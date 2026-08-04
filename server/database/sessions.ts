import chalk from "chalk";
import { prisma } from "./postgres.ts";
import { executeFunctionAfterInit } from "@/config.ts";
import { getDateWithTimeAhead, Logger } from "@common";

const deleteOldSessions = async () => {
  Logger.log(chalk.blue("Deleting old sessions and push tokens..."));
  try {
    const oldDate = getDateWithTimeAhead({ days: -20 });

    const [sessionDeleted, pushTokenDeleted] = await Promise.all([
      prisma.userSessions.deleteMany({
        where: { updatedAt: { lt: oldDate } },
      }),
      prisma.pushTokens.deleteMany({
        where: { createdAt: { lt: oldDate } },
      }),
    ]);

    Logger.log(
      chalk.green(
        "Old sessions and push tokens deleted successfully. Sessions Count:",
      ),
      sessionDeleted.count,
      chalk.green("Push Tokens Count:"),
      pushTokenDeleted.count,
    );
  } catch (error) {
    Logger.error(chalk.red("Error deleting old sessions:"), error);
  }
};

executeFunctionAfterInit(deleteOldSessions);
export default setInterval(deleteOldSessions, 24 * 60 * 60 * 1000);
