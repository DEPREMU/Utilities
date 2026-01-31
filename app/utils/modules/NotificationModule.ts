import type {
  ChannelsId,
  NotificationAction,
  ReasonNotification,
} from "@types";
import { logger } from "../functions/debug";
import { REPLACERS } from "../TOP_LEVEL";
import type { TurboModule } from "react-native";
import { TurboModuleRegistry } from "react-native";

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

const NotificationModule = REPLACERS.isNative
  ? TurboModuleRegistry.getEnforcing<Spec>("NotificationModule")
  : defaultNotificationModule;

if (
  REPLACERS.isDev &&
  (!NotificationModule || Object.keys(NotificationModule).length === 0)
) {
  logger.error?.("NotificationModule is not available");
}

export default NotificationModule;
