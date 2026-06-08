import chalk from "chalk";
import { Logger } from "@common";
import { prisma } from "./postgres.ts";
import { executeFunctionAfterInit } from "@/config.ts";

const deleteOldSessions = async () => {
  Logger.log(chalk.blue("Deleting old sessions and push tokens..."));
  try {
    const now = Date.now();
    const oldDate = new Date(now - 20 * 24 * 60 * 60 * 1000);

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
