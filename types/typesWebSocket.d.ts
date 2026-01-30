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

export type WebSocketMessage<T extends "sentByApp" | "sentByServer"> =
  T extends "sentByApp"
    ?
        | {
            type: "init";
            userId: string;
            language: LanguagesSupported;
            hasAdmin: boolean;
            theme: "light" | "dark" | "auto";
          }
        | {
            type: "language-change";
            language: LanguagesSupported;
          }
        | { type: "pong" }
    :
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
        | { type: "ping" };

export type ClipboardWebSocketMessage<T extends "sentByApp" | "sentByServer"> =
  T extends "sentByApp"
    ?
        | {
            type: "init";
            userId: string;
            deviceId: string;
          }
        | {
            type: "add-new-item";
            content: string;
          }
        | {
            type: "pong";
          }
    :
        | {
            id: string;
            type: "new-clipboard-item";
            content: string;
          }
        | {
            type: "ping";
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
