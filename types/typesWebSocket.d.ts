import type {
  ChannelsId,
  Notification,
  NotificationAction,
  ReasonNotification,
  Notifications as typeNotifications,
} from "./typesNotifications";
import type { WebSocket } from "ws";
import type { ResponseAuth } from "./API";
import type { CryptosSettings } from "@types";
import type { LanguagesSupported } from "./typesTranslations";
import { SelectedCryptos } from "@common";

export type WebSocketMessage<T extends "sentByApp" | "sentByServer"> =
  T extends "sentByApp"
    ?
        | {
            type: "init";
            userId: string;
            deviceId: string;
            language: LanguagesSupported;
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
        | { type: "pong" }
    :
        | {
            id: string;
            type: "new-clipboard-item";
            content: string;
          }
        | { type: "ping" };

export type CryptosWebSocketMessage<T extends "sentByApp" | "sentByServer"> =
  T extends "sentByApp"
    ?
        | {
            type: "init";
            userId: string;
            deviceId: string;
          }
        | {
            type: "sync-settings";
            settings?: CryptosSettings;
          }
        | {
            type: "add-crypto";
            crypto: Omit<
              SelectedCryptos[string],
              "id" | "datePurchased" | "userId"
            >;
          }
        | {
            type: "update-crypto";
            crypto: Partial<SelectedCryptos[string]>;
          }
        | {
            type: "delete-crypto";
            symbol: string;
          }
        | { type: "pong" }
        | { type: "get-cryptos" }
    :
        | { type: "ping" }
        | { type: "init-success" }
        | {
            type: "synced";
            settings?: CryptosSettings;
          }
        | {
            type: "cryptos";
            cryptos: SelectedCryptos[string][];
          };

export type WebSocketPathname =
  | "/ws"
  | "/clipboard"
  | "/ws-cryptos"
  | "/ws-login-qr";

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
        | {
            type: "remember-me";
            rememberMe: boolean;
          }
    :
        | {
            type: "status";
            status: "error" | "authenticating" | "authenticated-web";
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
