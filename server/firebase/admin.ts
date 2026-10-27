import chalk from "chalk";
import { prisma } from "@/database/postgres";
import { getEnvValue } from "../env";
import { ExecuteOnce, Logger, REPLACERS } from "@common";
import { ScreensAvailable, ChannelsId } from "@types";
import { initializeApp, cert, type App } from "firebase-admin/app";
import { getMessaging, type BatchResponse } from "firebase-admin/messaging";

const logger = new Logger("FirebaseAdmin");

const firebaseApp: App = ExecuteOnce.execute(
  "InitializeFirebaseAdmin",
  undefined,
  () => {
    try {
      const serviceAccount = JSON.parse(
        getEnvValue("FIREBASE_SERVICE_ACCOUNT"),
      );

      const app = initializeApp({
        credential: cert(serviceAccount),
      });

      logger.log(chalk.green("Firebase Admin SDK initialized successfully."));
      return app;
    } catch (error) {
      logger.error(chalk.red("Error initializing Firebase Admin SDK:"), error);
      throw error;
    }
  },
);

export const sendFCMNotification = async (
  tokens: string[],
  notification: {
    body: string;
    title: string;
    imageUrl?: string;
  },
  channelId: ChannelsId,
  data?: { screen: ScreensAvailable } & Record<string, string>,
): Promise<BatchResponse | undefined> => {
  if (REPLACERS.isDev) return;

  try {
    const messaging = getMessaging(firebaseApp);
    tokens = tokens.filter(
      (token) =>
        token &&
        token.trim() !== "" &&
        token.slice(0, 3).toLowerCase() !== "web",
    );
    if (tokens.length === 0) {
      logger.log(chalk.yellow("No valid tokens to send notifications."));
      return;
    }

    const imageUrl =
      typeof data?.image === "string" ? data.image : notification.imageUrl;

    const response = await messaging.sendEachForMulticast({
      data,
      notification,
      fids: tokens,
      android: { notification: { imageUrl, channelId } },
      apns: {
        payload: { aps: { sound: "default", badge: 1 } },
        fcmOptions: { imageUrl },
      },
    });

    logger.log(
      chalk.green(
        `Notifications sent: ${response.successCount}/${tokens.length}`,
      ),
    );

    if (response.failureCount > 0) {
      logger.error(chalk.red(`Failures: ${response.failureCount}`));

      const invalidTokens = response.responses
        .map((r, idx) => (!r.success || r.error ? tokens[idx] : null))
        .filter((token): token is string => !!token);

      const { count } = await prisma.pushTokens.deleteMany({
        where: { token: { in: invalidTokens } },
      });

      logger.error(
        chalk.red(`Deleted ${count}/${invalidTokens.length} tokens`),
      );
    }

    return response;
  } catch (error) {
    logger.error(chalk.red("Error sending FCM notification:"), error);
  }
};
