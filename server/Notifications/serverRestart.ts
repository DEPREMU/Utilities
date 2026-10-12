import chalk from "chalk";
import { prisma } from "@/database/postgres";
import { t, Logger } from "@common";
import { getEnvValue } from "../env";
import { getPagination } from "./utils";
import { ReasonNotification } from "@types";
import { sendFCMNotification } from "@/firebase/admin";

const logger = new Logger("NotificationsServerRestart");

const handleSendNotificationToAdmin = async () => {
  try {
    const email = getEnvValue("ADMIN_EMAIL");
    if (!email) return;

    const callback = (skip: number, take: number) =>
      prisma.users.findMany({
        where: {
          email,
          pushTokens: { some: { token: { not: "" } } },
        },
        include: {
          pushTokens: { select: { token: true } },
          userConfig: { select: { language: true } },
        },
        skip,
        take,
        orderBy: { userId: "asc" },
      });

    let USERS: Awaited<ReturnType<typeof callback>>;

    let success = 0;
    let failure = 0;

    const { getNext } = getPagination(callback);

    while ((USERS = await getNext()).length > 0) {
      try {
        const reason = "downDetector" satisfies ReasonNotification;

        const results = await Promise.all(
          USERS.map((user) => {
            try {
              if (!user.userConfig) return;

              const validTokens = user.pushTokens
                .map((pt) => pt.token)
                .filter((token) => token && token.length > 10);
              if (validTokens.length === 0) return;

              return sendFCMNotification(
                validTokens,
                {
                  title: t(
                    "notificationServerRestartTitle",
                    user.userConfig.language || "en",
                  ),
                  body: t(
                    "notificationServerRestartBody",
                    user.userConfig.language || "en",
                  ),
                },
                "downDetector",
                { screen: "Home", reason },
              );
            } catch {
              // Ignore individual user notification errors
            }
          }),
        );

        success += results.reduce((acc, res) => {
          return acc + (res?.successCount || 0);
        }, 0);
        failure += results.reduce((acc, res) => {
          return acc + (res?.failureCount || 0);
        }, 0);
      } catch (error) {
        logger.error(chalk.red("Error sending notification to admin:"), error);
      }
    }

    if (success > 0 || failure > 0)
      logger.log(
        chalk.green(
          `Notification sent to admin/s. Success: ${success}, Failure: ${failure}`,
        ),
      );
  } catch (error) {
    logger.error(
      chalk.red("Error fetching admin user for notification:"),
      error,
    );
  }
};

export default setTimeout(handleSendNotificationToAdmin, 30000);
