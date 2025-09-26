import { ScreensAvailable } from "./typesNavigation";

export type Notification = {
  id: string;
  title: string;
  body: string | null;
  data?: Record<string, unknown>;
  screen: ScreensAvailable;
  trigger: any | null;
} | null;

export type ReasonNotification = "cryptos" | "allNotifications" | "streamers";

export type typeStreamerNotification = { name: string; enabled: boolean };

export type Notifications = {
  enabled: Record<Exclude<ReasonNotification, "streamers">, boolean> & {
    streamers: Record<string, typeStreamerNotification>;
  };
  data: Record<ReasonNotification, Notification>;
  intervals: Record<ReasonNotification, number | null>;
};

export type ChannelsId = "streamers" | "cryptos" | "default";
