import chalk from "chalk";
import { prisma } from "@/database/postgres.ts";
import { t, Logger } from "@common";
import { getEnvValue } from "../env.ts";
import { ReasonNotification } from "@types";
import { sendFCMNotification } from "@/firebase/admin.ts";

const handleSendNotificationToAdmin = async () => {
  try {
    const users = await prisma.users.findMany({
      where: {
        email: getEnvValue("ADMIN_EMAIL"),
        pushTokens: { some: { token: { not: "" } } },
      },
      include: {
        pushTokens: { select: { token: true } },
        userConfig: { select: { language: true } },
      },
    });

    try {
      const reason = "downDetector" satisfies ReasonNotification;

      const results = await Promise.all(
        users.map((user) => {
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

      const success = results.reduce((acc, res) => {
        return acc + (res?.successCount || 0);
      }, 0);
      const failure = results.reduce((acc, res) => {
        return acc + (res?.failureCount || 0);
      }, 0);

      Logger.log(
        chalk.green(
          `Notification sent to admin/s. Success: ${success}, Failure: ${failure}`,
        ),
      );
    } catch (error) {
      Logger.error(
        "Error sending notification to admin:",
        error instanceof Error ? error.message : String(error),
      );
    }
  } catch (error) {
    Logger.error(
      "Error fetching admin user for notification:",
      error instanceof Error ? error.message : String(error),
    );
  }
};

export default setTimeout(handleSendNotificationToAdmin, 30000);
