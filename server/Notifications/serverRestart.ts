import chalk from "chalk";
import { prisma } from "@/database/postgres.ts";
import { t, Logger } from "@common";
import { getEnvValue } from "../env.ts";
import { getPagination } from "./utils.ts";
import { ReasonNotification } from "@types";
import { sendFCMNotification } from "@/firebase/admin.ts";

const handleSendNotificationToAdmin = async () => {
  try {
    const callback = (skip: number, take: number) =>
      prisma.users.findMany({
        where: {
          email: getEnvValue("ADMIN_EMAIL"),
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
        Logger.error(
          "Error sending notification to admin:",
          error instanceof Error ? error.message : String(error),
        );
      }
    }

    Logger.log(
      chalk.green(
        `Notification sent to admin/s. Success: ${success}, Failure: ${failure}`,
      ),
    );
  } catch (error) {
    Logger.error(
      "Error fetching admin user for notification:",
      error instanceof Error ? error.message : String(error),
    );
  }
};

export default setTimeout(handleSendNotificationToAdmin, 30000);
