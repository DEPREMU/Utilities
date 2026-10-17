import chalk from "chalk";
import { config } from "@/config";
import { prisma } from "./postgres";
import { Logger, Timers, getDateWithTimeAhead } from "@common";

const logger = new Logger("Database");

const deleteOldSessions = async () => {
  logger.log(chalk.blue("Deleting old sessions and push tokens..."));
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

    logger.log(
      chalk.green(
        "Old sessions and push tokens deleted successfully. Sessions Count:",
      ),
      sessionDeleted.count,
      chalk.green("Push Tokens Count:"),
      pushTokenDeleted.count,
    );
  } catch (error) {
    logger.error(chalk.red("Error deleting old sessions:"), error);
  }
};

config.executeFunctionAfterInit(deleteOldSessions);
export default Timers.setInterval(deleteOldSessions, 24 * 60 * 60 * 1000);
