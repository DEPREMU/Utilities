import { ScreensAvailable } from "./typesNavigation";

export type NotificationAction = {
  actionId: "pause" | "stop" | "dismiss" | "info" | "settings";
  title: string;
  icon?: "pause" | "play" | "stop" | "delete" | "info" | "settings";
};

export type Notification = {
  id: string;
  title: string;
  body: string | null;
  data?: Record<string, unknown>;
  screen: ScreensAvailable;
  trigger: any | null;
} | null;

export type ReasonNotification =
  | "cryptos"
  | "allNotifications"
  | "streamers"
  | "locationEnabled"
  | "noInternetConnection"
  | "batteryAlerts";

export type typeStreamerNotification = { name: string; enabled: boolean };

export type typePausedNotification = {
  isPaused: boolean;
  timePaused: number;
};

export type ActionNotification = "pause" | "stop" | "dismiss" | "settings";

export type Notifications = {
  enabled: Record<Exclude<ReasonNotification, "streamers">, boolean> & {
    streamers: Record<string, typeStreamerNotification>;
  };
  paused: Record<
    Exclude<ReasonNotification, "streamers">,
    typePausedNotification
  >;
  data: Record<ReasonNotification, Notification>;
  intervals: Record<ReasonNotification, number | null>;
};

export type ChannelsId =
  | Exclude<ReasonNotification, "allNotifications">
  | "default";
