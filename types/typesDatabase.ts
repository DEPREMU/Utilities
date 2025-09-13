import { ReasonNotification } from "./typesNotifications";
import type { UserData } from "./typesUser";

export type Logs = {
  id?: string;
  userId: string | null;
  timestamp: string;
  type: "log" | "warn" | "error";
  message: string;
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
  linkImage: string | null;
  userId: string;
  createdAt?: string;
};

export type Tables = {
  Users: UserData;
  Logs: Logs;
  Cryptos: Cryptos;
  PushTokens: PushTokens;
  Streamers: Streamer;
  UserConfig: UserConfig;
  ClipboardSync: ClipboardSync;
  UserNotificationsConfig: UserNotificationsConfig;
};

export type TablesKeys = keyof Tables;

export type UserKeys = keyof UserData;
export type LogsKeys = keyof Logs;

export type AllTableFieldKeys = keyof UserData | keyof Logs;
