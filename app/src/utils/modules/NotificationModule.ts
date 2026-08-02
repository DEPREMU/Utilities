import type {
  ChannelsId,
  NotificationAction,
  ReasonNotification,
} from "@types";
import { REPLACERS } from "@common";
import type { TurboModule } from "react-native";
import { TurboModuleRegistry } from "react-native";

interface Spec extends TurboModule {
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

const voidFunc = () => {};

const defaultNotificationModule: Spec = {
  createNotificationChannel: voidFunc,
  sendNotification: async () => 0,
  cancelNotification: voidFunc,
  cancelPreviousReasonNotification: voidFunc,
};

const NotificationModule = REPLACERS.isNative
  ? TurboModuleRegistry.getEnforcing<Spec>("NotificationModule")
  : defaultNotificationModule;

export { NotificationModule };
