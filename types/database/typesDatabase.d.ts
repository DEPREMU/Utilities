import type { UserData } from "./typesUser";
import type { type Prisma } from "../../server/generated/prisma";
import { LanguagesSupported } from "../typesTranslations";
import type { ReasonNotification } from "../typesNotifications";

declare global {
  export type DB = {
    TablesKeys: TablesKeys;
    TablesServer: TablesServer;
    TablesClient: TablesClient;
    LanguagesSupported: LanguagesSupported;
    ReasonNotification: ReasonNotification;
  };
}

export { Prisma };

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

export type Logs = Prisma.LogsGetPayload<{}>;

export type Users = Prisma.UsersGetPayload<{}>;

export type Cryptos = Prisma.CryptosGetPayload<{}>;

export type UserNotificationConfig =
  Prisma.UserNotificationsConfigGetPayload<{}>;

export type Streamers = Prisma.StreamersGetPayload<{}>;

export type PushTokens = Prisma.PushTokensGetPayload<{}>;

export type UserConfig = Prisma.UserConfigGetPayload<{}>;

export type UserSessions = Prisma.UserSessionsGetPayload<{}>;

export type DownDetector = Prisma.DownDetectorGetPayload<{}>;

export type ClipboardSync = Prisma.ClipboardSyncGetPayload<{}>;

type Serialized<T> = T extends string | number | boolean | null | undefined
  ? T
  : T extends Date
    ? string
    : T extends Prisma.Decimal
      ? number
      : T extends bigint
        ? string
        : T extends readonly (infer U)[]
          ? Serialized<U>[]
          : T extends object
            ? { [K in keyof T]: Serialized<T[K]> }
            : T;

export type TablesServer = {
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
  CryptosSettings: CryptosSettings & {
    autoRefresh: Serialized<NonNullable<CryptosSettings["autoRefresh"]>>;
    notifications: Serialized<NonNullable<CryptosSettings["notifications"]>>;
  };
  UserNotificationsConfig: UserNotificationConfig;
};

export type TablesClient = {
  [K in keyof TablesServer]: Serialized<TablesServer[K]>;
};

export type TablesKeys = keyof TablesServer;

export type UserKeys = keyof Users;
export type LogsKeys = keyof Logs;

export type AllTableFieldKeys = UserKeys | LogsKeys;
