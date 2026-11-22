import type { NotificationTriggerInput } from "expo-notifications";
import type { AndroidAction } from "react-native-notify-kit";

export type NotificationAction = {
  title: string;
  icon?: "pause" | "play" | "stop" | "delete" | "info" | "settings";
  actionId: "pause" | "stop" | "dismiss" | "info" | "settings";
};

export type ReasonNotification =
  | "cryptos"
  | "streamers"
  | "downDetector"
  | "batteryAlerts"
  | "timeToDownload"
  | "locationEnabled"
  | "updateAvailable"
  | "allNotifications"
  | "recorderNotification"
  | "noInternetConnection"
  | "loggedInStatusChannel";

export type typeStreamerNotification = { name: string; enabled: boolean };

export type typePausedNotification = {
  isPaused: boolean;
  timePaused: number;
};

export type OnlyWhenSpecificHours = {
  endHour: number;
  enabled: boolean;
  startHour: number;
};

export type OnlyWhen = {
  screenOff: boolean;
  specificHours: OnlyWhenSpecificHours;
  appInBackground: boolean;
  connectedToPower: boolean;
  notInDoNotDisturb: boolean;
};

export type typeBehaviorNotification = {
  onlyWhen: OnlyWhen;
  aggressive: boolean;
  bypassDoNotDisturb: boolean;
};

export type typeBehaviorHasInternet = {
  doubleCheck: boolean;
};

export type typeBehaviorBatteryNotification = {
  batteryLevel: {
    min: number;
    max: number;
  };
};

export type Notifications = {
  [Reason in ReasonNotification]: {
    paused: typePausedNotification;
    enabled: boolean;
    behavior: typeBehaviorNotification &
      (Reason extends "batteryAlerts"
        ? typeBehaviorBatteryNotification
        : Reason extends "noInternetConnection"
          ? typeBehaviorHasInternet
          : unknown);
  } & (Reason extends "streamers"
    ? { streamersList: typeStreamerNotification[] }
    : unknown);
};

export type Notification = {
  id: number;
  title: string;
  type: "success" | "error" | "warning" | "info";
  message: string;
  channelId: ChannelsId;
  timestamp: Date;
  reasonNotification: ReasonNotification;
  data?: Record<string, string | number | object>;
  trigger?: NotificationTriggerInput;
  actions?: AndroidAction[];
};

export type ChannelsId =
  | Exclude<ReasonNotification, "allNotifications">
  | "default"
  | "ForegroundServiceChannel";
