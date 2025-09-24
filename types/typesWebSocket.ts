import type {
  ReasonNotification,
  Notifications as typeNotifications,
} from "./typesNotifications";
import type { ScreensAvailable } from "./typesNavigation";
import type { LanguagesSupported } from "./typesTranslations";
import type { NotificationTriggerInput } from "../app/node_modules/expo-notifications/build/index";

export type WebSocketMessage =
  | {
      type: "init";
      userId: string;
      language: LanguagesSupported;
      notifications: typeNotifications | null;
      hasAdmin: boolean;
      theme: "light" | "dark" | "auto";
    }
  | { type: "ping" }
  | {
      type: "notifications";
      data: typeNotifications;
      userId: string;
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
        trigger?: NotificationTriggerInput;
        screen?: ScreensAvailable;
        data?: Record<string, unknown>;
      };
    }
  | {
      type: "pong";
    };

export type ClipboardWebSocketMessage =
  | {
      type: "new-clipboard-item";
      content: string;
    }
  | {
      type: "init";
      userId: string;
      deviceId: string;
    };

export type WebSocketPathname = "/ws" | "/clipboard";
