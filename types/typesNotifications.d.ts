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
  | "recorderNotification"
  | "noInternetConnection"
  | "loggedInStatusChannel";

export type typeStreamerNotification = { name: string; enabled: boolean };

export type typePausedNotification = {
  isPaused: boolean;
  timePaused: number;
};

export type ActionNotification = "pause" | "stop" | "dismiss" | "settings";

"cryptos" |
  "streamers" |
  "downDetector" |
  "batteryAlerts" |
  "timeToDownload" |
  "locationEnabled" |
  "allNotifications" |
  "recorderNotification" |
  "noInternetConnection" |
  "loggedInStatusChannel";

export type typeBehaviorNotification = {
  onlyWhenScreenOff: boolean;
  bypassDoNotDisturb: boolean;
  onlyWhenAppInBackground: boolean;
  onlyWhenConnectedToPower: boolean;
  onlyWhenNotInDoNotDisturb: boolean;
  onlyDuringSpecificHours: {
    enabled: boolean;
    startHour: number;
    endHour: number;
  };
};

export type typeBehaviorBatteryNotification = {};

export type Notifications = {
  [reason in ReasonNotification]: {
    paused: typePausedNotification;
    enabled: boolean;
    interval: number;
    behavior: typeBehaviorNotification &
      (reason extends "batteryAlerts" ? typeBehaviorBatteryNotification : {});
  } & (reason extends "streamers"
    ? { streamersList: typeStreamerNotification[] }
    : {});
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
