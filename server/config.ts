import path from "path";
import { TablesKeys } from "@types";
import { Directory, REPLACERS } from "@common";

export const port = 3000;
export const host = "0.0.0.0";

export const TABLE_MAP = {
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
} as const satisfies Record<TablesKeys, string>;

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

const ROOT = process.cwd() || path.resolve();

const PATHS = {
  ROOT,
  UPLOAD_DIR: REPLACERS.isDev
    ? path.join(ROOT, "routes", "updates", "uploads")
    : path.join(ROOT, "uploads"),
  WEB_PATH_UPDATES: REPLACERS.isDev
    ? path.join(ROOT, "routes", "updates", "web-page")
    : path.join(ROOT, "web-page"),
  DATA_UPDATES: REPLACERS.isDev
    ? path.join(ROOT, "routes", "updates", "data.json")
    : path.join(ROOT, "data.json"),
  DATABASE_BACKUPS: REPLACERS.isDev
    ? path.join(ROOT, "database", "backups")
    : path.join(ROOT, "backups"),
  CRYPTOS_JSON_DEV: REPLACERS.isDev
    ? path.join(ROOT, "routes", "cryptos", "cryptos.json")
    : "",
} as const;

const createDirs = async () => {
  const keys = [
    "UPLOAD_DIR",
    "DATABASE_BACKUPS",
  ] as const satisfies (keyof typeof PATHS)[];

  await Promise.all(
    keys.map(async (key) => {
      const dir = new Directory(PATHS[key]);
      if (!(await dir.exists())) await dir.mkdir({ recursive: true });
    }),
  );
};
void createDirs();

export const getRoutes = (key: keyof typeof PATHS): string => {
  return PATHS[key];
};
