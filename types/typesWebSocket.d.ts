import type {
  ChannelsId,
  Notification,
  NotificationAction,
  ReasonNotification,
  Notifications as typeNotifications,
} from "./typesNotifications";
import type { LanguagesSupported } from "./typesTranslations";

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
      notification: Notification;
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
