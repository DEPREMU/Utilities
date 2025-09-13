import * as Notifications from "../app/node_modules/expo-notifications";
import { ScreensAvailable } from "./typesNavigation";
import {
  ReasonNotification,
  Notifications as typeNotifications,
} from "./typesNotifications";
import { LanguagesSupported } from "./typesTranslations";

export type WebSocketMessage =
  | {
      type: "init";
      uid: string;
      language: LanguagesSupported;
      notifications: typeNotifications | null;
      hasAdmin: boolean;
      theme: "light" | "dark" | "auto";
    }
  | { type: "ping" }
  | {
      type: "notifications";
      data: typeNotifications;
      uid: string;
    }
  | {
      type: "language-change";
      language: LanguagesSupported;
    };

export type WebSocketResponse =
  | {
      type: "init-success" | "init-failure";
      message: string;
    }
  | {
      type: "not-user-id";
      message: string;
      timestamp: string;
    }
  | {
      type: "notification";
      notification: {
        reason: ReasonNotification;
        title: string;
        body: string;
        trigger?: Notifications.NotificationTriggerInput;
        screen?: ScreensAvailable;
        data?: Record<string, unknown>;
      };
    }
  | {
      type: "pong";
    };
