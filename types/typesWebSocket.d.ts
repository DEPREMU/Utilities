import type {
  ChannelsId,
  Notification,
  NotificationAction,
  ReasonNotification,
  Notifications as typeNotifications,
} from "./typesNotifications";
import { WebSocket } from "ws";
import { ResponseAuth } from "./API";
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

export type WebSocketPathname = "/ws" | "/clipboard" | "/ws-login-qr";

type UsersWebSocketQR = {
  [deviceId: string]: {
    ws: WebSocket;
    qrCode: {
      dataURL: string;
      timeoutId: NodeJS.Timeout | number | null;
    };
  };
};

type LoginWithQRMobile = {
  type: "scanned";
  token: string;
  deviceId: string;
  rememberMe: boolean;
};

export type MessageWebSocketQRLogin<T extends "sentByApp" | "sentByServer"> =
  T extends "sentByApp"
    ?
        | LoginWithQRMobile
        | {
            type: "init-web" | "init-mobile";
            deviceId: string;
            rememberMe?: boolean;
          }
    :
        | {
            type: "status";
            status: "error" | "timeout" | "waiting" | "authenticated-web";
          }
        | {
            type: "status";
            status: "authenticated";
            response: ResponseAuth;
          }
        | {
            type: "qr-code";
            dataURL: string;
          };
