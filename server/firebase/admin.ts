import chalk from "chalk";
import admin from "firebase-admin";
import { prisma } from "@/database/postgres";
import { getEnvValue } from "../env";
import { Logger, REPLACERS } from "@common";
import { ScreensAvailable, ChannelsId } from "@types";

const logger = new Logger("FirebaseAdmin");

let firebaseApp: admin.app.App | null = null;

export const initializeFirebaseAdmin = () => {
  if (firebaseApp) return firebaseApp;

  try {
    const serviceAccount = JSON.parse(getEnvValue("FIREBASE_SERVICE_ACCOUNT"));

    firebaseApp = admin.initializeApp({
      credential: admin.credential.cert(serviceAccount),
    });

    logger.log(chalk.green("Firebase Admin SDK initialized successfully."));
    return firebaseApp;
  } catch (error) {
    logger.error(chalk.red("Error initializing Firebase Admin SDK:"), error);
    throw error;
  }
};

export const getFirebaseAdmin = () => {
  return firebaseApp || initializeFirebaseAdmin();
};

export const sendFCMNotification = async (
  tokens: string[],
  notification: {
    title: string;
    body: string;
    imageUrl?: string;
  },
  channelId: ChannelsId,
  data?: { screen: ScreensAvailable } & Record<string, string>,
) => {
  if (REPLACERS.isDev) return;

  try {
    const messaging = getFirebaseAdmin().messaging();
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

    const message: admin.messaging.MulticastMessage = {
      tokens,
      notification: {
        body: notification.body,
        title: notification.title,
        imageUrl: notification.imageUrl,
      },
      android: { notification: { imageUrl, channelId } },
      apns: {
        payload: { aps: { sound: "default", badge: 1 } },
        fcmOptions: { imageUrl },
      },
      data: data || undefined,
    };

    const response = await messaging.sendEachForMulticast(message);

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
