import chalk from "chalk";
import env from "../env.ts";
import admin from "firebase-admin";
import { ScreensAvailable, ChannelsId } from "@types";

let firebaseApp: admin.app.App | null = null;

export const initializeFirebaseAdmin = () => {
  if (firebaseApp) return firebaseApp;

  try {
    const serviceAccount = JSON.parse(env.FIREBASE_SERVICE_ACCOUNT);

    firebaseApp = admin.initializeApp({
      credential: admin.credential.cert(serviceAccount),
    });

    console.log(chalk.green("Firebase Admin SDK initialized successfully."));
    return firebaseApp;
  } catch (error) {
    console.error(chalk.red("Error initializing Firebase Admin SDK:"), error);
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
        title: notification.title,
        body: notification.body,
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

    console.log(
      chalk.green(
        `Notifications sent: ${response.successCount}/${tokens.length}`,
      ),
    );

    if (response.failureCount > 0) {
      console.error(chalk.red(`Failures: ${response.failureCount}`));
      response.responses.forEach((resp, idx) => {
        if (!resp.success) {
          console.error(
            chalk.red(`Error in token ${tokens[idx]}: ${resp.error}`),
          );
        }
      });
    }

    return response;
  } catch (error) {
    console.error(chalk.red("Error sending FCM notification:"), error);
  }
};
