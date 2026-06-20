import path from "path";
import { Directory } from "@common";
import { TablesKeys } from "@types";
import { getEnvValue } from "@/env.ts";

export const REPLACERS = {
  isDev: getEnvValue("__DEV__"),
};

export const host: string = REPLACERS.isDev ? "0.0.0.0" : "localhost";
export const port: number = 3000;
export const serverPath = path.resolve();
export const UPLOAD_DIR = path.join(serverPath, "routes", "updates", "uploads");
export const PATH_WEB_PATH_UPDATES = path.join(
  serverPath,
  "routes",
  "updates",
  "web-page",
);
export const PATH_DATA_UPDATES = path.join(
  serverPath,
  "routes",
  "updates",
  "data.json",
);

const createUploadDir = async () => {
  const dir = new Directory(UPLOAD_DIR);
  if (!(await dir.exists())) await dir.mkdir({ recursive: true });
};
void createUploadDir();

export const TABLE_MAP: Record<TablesKeys, string> = {
  Logs: "logs",
  Users: "users",
  Notes: "notes",
  Cryptos: "cryptos",
  Streamers: "streamer",
  PushTokens: "push_tokens",
  UserConfig: "user_config",
  DownDetector: "down_detector",
  UserSessions: "user_sessions",
  ClipboardSync: "clipboard_sync",
  CryptosSettings: "cryptos_settings",
  UserNotificationsConfig: "user_notifications_config",
};

type Functions = () => Promise<unknown> | unknown;

let initialized = false;
const functions: Functions[] = [];

export const executeFunctionAfterInit = (func: Functions) => {
  if (!initialized) functions.push(func);
  else return func();
};

export const executeFunctions = async () => {
  initialized = true;
  const start = Date.now();
  const MAX_TIME = 30 * 1000;

  while (functions.length > 0 || Date.now() - start > MAX_TIME) {
    const func = functions.shift();
    if (typeof func === "function") await func();
  }
};
