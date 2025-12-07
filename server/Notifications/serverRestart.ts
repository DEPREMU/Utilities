import env from "env";
import chalk from "chalk";
import { t } from "translations/index.ts";
import { fetchFromTable } from "database/functions.ts";
import { ReasonNotification } from "@types";
import { sendFCMNotification } from "firebase/admin.ts";

const handleSendNotificationToAdmin = async () => {
  try {
    const fetch = await fetchFromTable({
      table: "Users",
      match: { email: env.ADMIN_EMAIL },
    });

    const user = Array.isArray(fetch.data) ? fetch.data[0] : fetch.data;
    if (!user) {
      console.log(chalk.red("Admin user not found for notifications."));
      return;
    }

    const fetchToken = await fetchFromTable({
      table: "PushTokens",
      match: { userId: user.userId },
    });
    const tokens = Array.isArray(fetchToken.data)
      ? fetchToken.data
      : [fetchToken.data];
    const validTokens =
      tokens
        ?.map((t) => t?.token)
        .filter((t): t is string => typeof t === "string" && t.length > 10) ||
      [];

    const fetchUserConfig = await fetchFromTable({
      table: "UserConfig",
      match: { userId: user.userId },
    });
    const userConfig = Array.isArray(fetchUserConfig.data)
      ? fetchUserConfig.data[0]
      : fetchUserConfig.data;

    if (validTokens.length === 0) {
      console.log(
        chalk.yellow("No valid tokens found for admin notification."),
      );
      return;
    }

    try {
      const reason: ReasonNotification = "downDetector";
      const res = await sendFCMNotification(
        validTokens,
        {
          title: t(
            "notificationServerRestartTitle",
            userConfig?.language || "en",
          ),
          body: t(
            "notificationServerRestartBody",
            userConfig?.language || "en",
          ),
        },
        "downDetector",
        { screen: "Home", reason },
      );
      console.log(
        chalk.green(
          `Notification sent to admin. Success: ${res?.successCount || 0}, Failure: ${res?.failureCount || 0}`,
        ),
      );
    } catch (error) {
      console.error(
        "Error sending notification to admin:",
        error instanceof Error ? error.message : String(error),
      );
    }
  } catch (error) {
    console.error(
      "Error fetching admin user for notification:",
      error instanceof Error ? error.message : String(error),
    );
  }
};

export default setTimeout(handleSendNotificationToAdmin, 30000);
