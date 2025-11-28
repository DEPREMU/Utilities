import fs from "fs";
import env from "./env.ts";
import path from "path";
import { TablesKeys } from "@types";

export const host: string = env.HOST || "localhost";
export const port: number = Number(env.PORT) || 3000;
export const useHTTPS: boolean = env.USE_HTTPS === "true";

export const serverPath = path.resolve();
export const UPLOAD_DIR = path.join(serverPath, "updates", "uploads");
export const PATH_DATA_UPDATES = path.join(serverPath, "updates", "data.json");

try {
  if (!fs.existsSync(UPLOAD_DIR)) {
    fs.mkdirSync(UPLOAD_DIR, { recursive: true });
  }
} catch {
  // ignore
}

export const TABLE_MAP: Record<TablesKeys, string> = {
  Logs: "logs",
  Users: "users",
  Cryptos: "cryptos",
  Streamers: "streamer",
  PushTokens: "push_tokens",
  DownDetector: "down_detector",
  UserConfig: "user_config",
  UserSessions: "user_sessions",
  ClipboardSync: "clipboard_sync",
  UserNotificationsConfig: "user_notifications_config",
};
