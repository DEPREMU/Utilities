import { ActionNotification, ReasonNotification } from "./typesNotifications";

export type EventNativeModule = {
  actionId: ActionNotification;
  notificationId: number;
  title: string;
  message: string;
  reasonNotification: ReasonNotification;
  data: Record<string, unknown>;
};
