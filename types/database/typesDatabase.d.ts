import type { UserData } from "./typesUser";
import { LanguagesSupported } from "../typesTranslations";
import type { ReasonNotification } from "../typesNotifications";

export type Logs = {
  id?: string;
  type: "log" | "warn" | "error";
  userId?: string;
  message: string;
  deviceId: string;
  timestamp: string;
  deviceName: string;
};

export type Crypto = {
  uid?: string;
  id: string;
  symbol: string;
  amount: string;
  userId: string;
  currency: string;
  datePurchased: string;
  firstPricePurchased: number;
};

export type PushTokens = {
  id?: string;
  token: string;
  userId: string;
  createdAt?: string;
};

export type UserNotificationsConfig = {
  id?: string;
  userId: string;
  reason: ReasonNotification;
  streamer?: string | null;
  paused: boolean;
  pauseTime: -1 | number;
  enabled: boolean;
  interval: -1 | number;
  updatedAt: string;
  createdAt?: string;
};

export type UserConfig = {
  id?: string;
  theme: "light" | "dark" | "auto";
  userId: string;
  API_URL?: string;
  language: LanguagesSupported;
  hasAdmin: boolean;
  updatedAt: string;
  createdAt?: string;
  webSocketURL?: string;
};

export type ClipboardSync = {
  id?: string;
  userId: string;
  content: string;
  deleted?: boolean;
  deviceId: string;
  createdAt: string;
};

export type Streamer = {
  id?: string;
  name: string;
  userId: string;
  linkImage: string | null;
  createdAt?: string;
};

export type UserSessions = {
  id?: string;
  token: string;
  userId: string;
  deviceId: string;
  updatedAt: string;
  createdAt?: string;
};

export type DownDetector = {
  id?: string;
  url: string;
  userId: string;
  createdAt: string;
  sendNotification: boolean;
};

export type SourceNotes = {
  id?: string;
  uri: string;
  type: "image" | "video" | "audio" | "other";
  name?: string;
  size?: number | null;
  mimeType?: string | null;
  durationMs?: number;
  noteId?: string;
};

export type Notes = {
  id?: string;
  userId: string;
  title?: string;
  content: string;
  folderId?: string | null;
  isPinned?: boolean;
  isHidden?: boolean;
  richTextRuns?:
    | {
        start: number;
        end: number;
        style: {
          color?: string;
          fontSize?: number;
          fontFamily?: string;
          fontWeight?: "normal" | "bold";
          fontStyle?: "normal" | "italic";
          textDecorationLine?: "none" | "underline" | "line-through";
        };
      }[]
    | null;
  sources: SourceNotes[] | null;
  createdAt: string;
  updatedAt: string;
};

export type Tables = {
  Logs: Logs;
  Notes: Notes;
  Users: UserData;
  Cryptos: Crypto;
  Streamers: Streamer;
  UserConfig: UserConfig;
  PushTokens: PushTokens;
  DownDetector: DownDetector;
  UserSessions: UserSessions;
  ClipboardSync: ClipboardSync;
  UserNotificationsConfig: UserNotificationsConfig;
};

export type TablesKeys = keyof Tables;

export type UserKeys = keyof UserData;
export type LogsKeys = keyof Logs;

export type AllTableFieldKeys = keyof UserData | keyof Logs;
