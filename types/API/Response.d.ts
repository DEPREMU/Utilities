import type { Falsy } from "react-native";
import { AvailableServices } from "../typesThirdPartyStateManager";
import type { type treeifyError } from "zod";
import { RequestChangeImageFormat } from "./Request";
import type { ExpectedStorageTypes } from "@common";

export { Falsy };

export type ErrorZod = ReturnType<typeof treeifyError>;

export type ErrorResponse = {
  error: ErrorZod | string;
  timestamp: number;
};

export type ResponseHealth = {
  uptime: number;
  status: "running";
  timestamp: string;
  uptimeString: string;
};

export type ResponseAuth<T extends "login" | "signup"> = T extends "login"
  ? {
      user?: Omit<DB["TablesClient"]["Users"], "password">;
      token?: string;
      success: boolean;
      storageValues?: Partial<ExpectedStorageTypes<"BOTH">>;
    }
  : {
      success: boolean;
    };

export type ResponseDoQuery = {
  result?: {
    rowCount: number;
    rows: unknown[];
    command: string;
    fields?: unknown[];
  };
  success: boolean;
};

export type ResponseChangeImageFormat = {
  success: boolean;
  imageUri?: string;
  newFormat?: RequestChangeImageFormat["format"];
};

export type ResponseDebugAppAlive = {
  success: boolean;
  timestamp: string;
};

export type ResponseUnavailableService = {
  error: string;
  dependency: AvailableServices;
};
