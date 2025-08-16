import { typeLanguages } from "./typesTranslations";
import { ScreensAvailable } from "./typesNavigation";

export type Notification = {
  id: string;
  title: string;
  body: string | null;
  data?: Record<string, unknown>;
  screen: ScreensAvailable;
  trigger: any | null;
} | null;

export type ReasonNotification = "cryptos";

export type Notifications = {
  enabled: Record<ReasonNotification | "allNotifications", boolean>;
  data: Record<ReasonNotification, Notification>;
  intervals: Record<ReasonNotification, number | null>;
};
