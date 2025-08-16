import * as Notifications from "expo-notifications";
import { ScreensAvailable } from "./typesNavigation";
import {
  ReasonNotification,
  Notifications as typeNotifications,
} from "./typesNotifications";
import { Cryptos } from "./typesDatabase";

export type WebSocketMessage =
  | {
      type: "init";
      uid: string;
      language: string;
    }
  | { type: "ping" }
  | {
      type: "notifications";
      data: typeNotifications;
      uid: string;
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
    };
