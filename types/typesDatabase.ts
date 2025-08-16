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
  }

export type Tables = { Users: UserData; Logs: Logs, Cryptos: Cryptos };

export type TablesKeys = keyof Tables;

export type UserKeys = keyof UserData;
export type LogsKeys = keyof Logs;

export type AllTableFieldKeys = keyof UserData | keyof Logs;
