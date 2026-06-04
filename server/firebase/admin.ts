import chalk from "chalk";
import admin from "firebase-admin";
import { Logger } from "@common";
import { getEnvValue } from "../env.ts";
import { deleteInTable } from "../database/functions.ts";
import { ScreensAvailable, ChannelsId } from "@types";

let firebaseApp: admin.app.App | null = null;

export const initializeFirebaseAdmin = () => {
  if (firebaseApp) return firebaseApp;

  try {
    const serviceAccount = JSON.parse(getEnvValue("FIREBASE_SERVICE_ACCOUNT"));

    firebaseApp = admin.initializeApp({
      credential: admin.credential.cert(serviceAccount),
    });

    Logger.log(chalk.green("Firebase Admin SDK initialized successfully."));
    return firebaseApp;
  } catch (error) {
    Logger.error(chalk.red("Error initializing Firebase Admin SDK:"), error);
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
  try {
    const messaging = getFirebaseAdmin().messaging();

    const message: admin.messaging.MulticastMessage = {
      tokens,
      notification: {
        body: notification.body,
        title: notification.title,
        imageUrl: notification.imageUrl,
      },
      ...(data && { data }),
      android: {
        notification: {
          channelId,
          imageUrl: data?.image,
        },
      },
      apns: {
        payload: {
          aps: {
            sound: "default",
            badge: 1,
          },
        },
        fcmOptions: {
          imageUrl: data?.image,
        },
      },
    };

    const response = await messaging.sendEachForMulticast(message);

    Logger.log(
      chalk.green(
        `Notifications sent: ${response.successCount}/${tokens.length}`,
      ),
    );

    if (response.failureCount > 0) {
      Logger.error(chalk.red(`Failures: ${response.failureCount}`));
      response.responses.forEach((resp, idx) => {
        if (!resp.success) {
          Logger.error(
            chalk.red(
              `Error in token ${tokens[idx].slice(0, 20)}...: ${resp.error}`,
            ),
          );

          if (resp.error?.message.includes("Requested entity was not found.")) {
            deleteInTable("", "PushTokens", {
              token: tokens[idx],
            });
          }
        }
      });
    }

    return response;
  } catch (error) {
    Logger.error(chalk.red("Error sending FCM notification:"), error);
  }
};
