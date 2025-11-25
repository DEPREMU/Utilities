import type {
  ChannelsId,
  NotificationAction,
  ReasonNotification,
} from "@types";
import { logError } from "../functions";
import type { TurboModule } from "react-native";
import { Platform, TurboModuleRegistry } from "react-native";

export interface Spec extends TurboModule {
  createNotificationChannel: (
    channelId: string,
    channelName: string,
    importance: number,
  ) => void;
  sendNotification: (
    notificationId: number,
    title: string,
    message: string,
    channelId: ChannelsId,
    reasonNotification: ReasonNotification,
    overrideNotification: boolean,
    data: Record<string, unknown>,
    actions: NotificationAction[] | null,
  ) => Promise<number>;
  cancelNotification: (
    notificationId: number,
    reasonNotification: ReasonNotification,
  ) => void;
  cancelPreviousReasonNotification: (
    reasonNotification: ReasonNotification,
  ) => void;
}

const defaultNotificationModule: Spec = {
  createNotificationChannel: () => {},
  sendNotification: async () => 0,
  cancelNotification: () => {},
  cancelPreviousReasonNotification: () => {},
};

const NotificationModule =
  Platform.OS === "android"
    ? TurboModuleRegistry.getEnforcing<Spec>("NotificationModule")
    : defaultNotificationModule;

if (
  process.env.NODE_ENV === "development" &&
  (!NotificationModule || Object.keys(NotificationModule).length === 0)
) {
  logError("NotificationModule is not available");
}

export default NotificationModule;
