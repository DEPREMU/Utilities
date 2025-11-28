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
    }
  | {
      type: "add-new-item";
      content: string;
    };

export type WebSocketPathname = "/ws" | "/clipboard";
