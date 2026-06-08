import type {
  Logs,
  Users,
  Notes,
  type Prisma,
  Cryptos,
  Streamers,
  PushTokens,
  UserConfig,
  UserSessions,
  DownDetector,
  ClipboardSync,
  CryptosSettings,
  UserNotificationConfig,
} from "../../server/generated/prisma";
import type { UserData } from "./typesUser";
import { LanguagesSupported } from "../typesTranslations";
import type { ReasonNotification } from "../typesNotifications";

declare global {
  export type DB = {
    Tables: Tables;
    TablesKeys: TablesKeys;
    LanguagesSupported: LanguagesSupported;
    ReasonNotification: ReasonNotification;
  };
}

export type Notes = Prisma.NoteGetPayload<{
  include: {
    sources: true;
    richTextRuns: true;
  };
}>;

export type CryptosSettings = Prisma.CryptosSettingsGetPayload<{
  include: {
    autoRefresh: true;
    notifications: true;
  };
}>;

export type Tables = {
  Logs: Logs;
  Notes: Notes;
  Users: Users;
  Cryptos: Cryptos;
  Streamers: Streamers;
  UserConfig: UserConfig;
  PushTokens: PushTokens;
  DownDetector: DownDetector;
  UserSessions: UserSessions;
  ClipboardSync: ClipboardSync;
  CryptosSettings: CryptosSettings;
  UserNotificationsConfig: UserNotificationConfig;
};

export type TablesKeys = keyof Tables;

export type UserKeys = keyof Users;
export type LogsKeys = keyof Logs;

export type AllTableFieldKeys = UserKeys | LogsKeys;
