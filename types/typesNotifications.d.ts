import type { NotificationTriggerInput } from "expo-notifications";

export type NotificationAction = {
  actionId: "pause" | "stop" | "dismiss" | "info" | "settings";
  title: string;
  icon?: "pause" | "play" | "stop" | "delete" | "info" | "settings";
};

export type ReasonNotification =
  | "cryptos"
  | "streamers"
  | "downDetector"
  | "batteryAlerts"
  | "timeToDownload"
  | "locationEnabled"
  | "allNotifications"
  | "noInternetConnection"
  | "loggedInStatusChannel";

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

  intervals: Record<ReasonNotification, number | null>;
};

export type Notification = {
  id: number;
  title: string;
  type: "success" | "error" | "warning" | "info";
  message: string;
  channelId: ChannelsId;
  timestamp: Date;
  reasonNotification: ReasonNotification;
  overrideNotification: boolean;
  data?: Record<string, unknown>;
  trigger?: NotificationTriggerInput;
  actions?: NotificationAction[];
};

export type ChannelsId =
  | Exclude<ReasonNotification, "allNotifications">
  | "default"
  | "ForegroundServiceChannel";
