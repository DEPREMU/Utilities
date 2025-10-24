import type {
  ChannelsId,
  NotificationAction,
  ReasonNotification,
} from "@types";
import chalk from "chalk";
import { logError } from "../functions";
import type { TurboModule } from "react-native";
import { Platform, TurboModuleRegistry } from "react-native";

export interface Spec extends TurboModule {
  createNotificationChannel(
    channelId: string,
    channelName: string,
    importance: number,
  ): void;
  sendNotification(
    notificationId: number,
    title: string,
    message: string,
    channelId: ChannelsId,
    reasonNotification: ReasonNotification,
    overrideNotification: boolean,
    data: Record<string, unknown>,
    actions: NotificationAction[] | null,
  ): Promise<number>;
  cancelNotification(notificationId: number): void;
  cancelAllNotifications(): void;
}

const defaultNotificationModule: Spec = {
  createNotificationChannel: () => {},
  sendNotification: async () => 0,
  cancelNotification: () => {},
  cancelAllNotifications: () => {},
};

const NotificationModule =
  Platform.OS === "android"
    ? TurboModuleRegistry.getEnforcing<Spec>("NotificationModule")
    : defaultNotificationModule;

if (
  process.env.NODE_ENV === "development" &&
  (!NotificationModule || Object.keys(NotificationModule).length === 0)
) {
  logError(chalk.red("NotificationModule is not available"));
}

export default NotificationModule;
