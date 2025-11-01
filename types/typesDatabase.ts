import { ReasonNotification } from "./typesNotifications";
import type { UserData } from "./typesUser";

export type Logs = {
  id?: string;
  type: "log" | "warn" | "error";
  userId: string | null;
  message: string;
  deviceId: string;
  timestamp: string;
  deviceName: string;
};

export type Cryptos = {
  uid?: string;
  id: string;
  amount: string;
  firstPricePurchased: number;
  datePurchased: string;
  currency: string;
  userId: string;
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
  language: string;
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

export type Tables = {
  Logs: Logs;
  Users: UserData;
  Cryptos: Cryptos;
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
