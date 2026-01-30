import fs from "fs";
import path from "path";
import { TablesKeys } from "@types";
import { getEnvValue } from "env";

export const host: string = getEnvValue("__DEV__") ? "0.0.0.0" : "localhost";
export const port: number = 3000;
export const serverPath = path.resolve();
export const UPLOAD_DIR = path.join(serverPath, "updates", "uploads");
export const PATH_DATA_UPDATES = path.join(serverPath, "updates", "data.json");

try {
  if (!fs.existsSync(UPLOAD_DIR)) fs.mkdirSync(UPLOAD_DIR, { recursive: true });
} catch {
  // ignore
}

export const TABLE_MAP: Record<TablesKeys, string> = {
  Logs: "logs",
  Users: "users",
  Cryptos: "cryptos",
  Streamers: "streamer",
  PushTokens: "push_tokens",
  UserConfig: "user_config",
  DownDetector: "down_detector",
  UserSessions: "user_sessions",
  ClipboardSync: "clipboard_sync",
  UserNotificationsConfig: "user_notifications_config",
};
