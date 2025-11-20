import { fetchFromTable } from "database/functions.ts";
import chalk from "chalk";
import { sendFCMNotification } from "firebase/admin.ts";
import { t } from "translations/index.ts";

const handleSendNotificationToAdmin = async () => {
  try {
    const fetch = await fetchFromTable("Users", {
      email: process.env.ADMIN_EMAIL || "",
    });

    const user = Array.isArray(fetch.data) ? fetch.data[0] : fetch.data;
    if (!user) {
      console.log(chalk.red("Admin user not found for notifications."));
      return;
    }

    const fetchToken = await fetchFromTable("PushTokens", {
      userId: user.userId,
    });
    const tokens = Array.isArray(fetchToken.data)
      ? fetchToken.data
      : [fetchToken.data];
    const validTokens =
      tokens
        ?.map((t) => t?.token)
        .filter((t): t is string => typeof t === "string" && t.length > 10) ||
      [];

    const fetchUserConfig = await fetchFromTable("UserConfig", {
      userId: user.userId,
    });
    const userConfig = Array.isArray(fetchUserConfig.data)
      ? fetchUserConfig.data[0]
      : fetchUserConfig.data;

    try {
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
