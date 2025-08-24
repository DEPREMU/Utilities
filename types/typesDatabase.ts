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
  enabled: boolean;
  interval: number | -1;
  updatedAt: string;
  createdAt?: string;
};

export type UserConfig = {
  id?: string;
  userId: string;
  API_URL?: string;
  language: string;
  hasAdmin: boolean;
  updatedAt: string;
  createdAt?: string;
  webSocketURL?: string;
};

export type Tables = {
  Users: UserData;
  Logs: Logs;
  Cryptos: Cryptos;
  PushTokens: PushTokens;
  UserConfig: UserConfig;
  UserNotificationsConfig: UserNotificationsConfig;
};

export type TablesKeys = keyof Tables;

export type UserKeys = keyof UserData;
export type LogsKeys = keyof Logs;

export type AllTableFieldKeys = keyof UserData | keyof Logs;
