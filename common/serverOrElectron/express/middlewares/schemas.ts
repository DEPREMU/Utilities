import { languagesSupported, reasonNotification } from "@commonSrc/both";
import { Enums, MethodsAPI, Prisma, ResolveRoute, Theme } from "@types";
import { z } from "zod";

type ZodField<T> = [T] extends [never]
  ? z.ZodNever
  : unknown extends T
    ? z.ZodNever
    : // eslint-disable-next-line @typescript-eslint/no-explicit-any
      z.ZodType<T, any, any>;

type ZodShape<T extends object> = {
  [K in keyof T]: ZodField<T[K]>;
};

type APIInput = {
  [K in MethodsAPI]: {
    [R in RoutesAPI[K]]: [ResolveRoute<FetchAPI<K>, R>] extends [never]
      ? never
      : {
          params?: RequestSchema<
            ResolveRoute<FetchAPI<K>, R>["requestInput"]["params"]
          >;

          body?: RequestSchema<
            ResolveRoute<FetchAPI<K>, R>["requestInput"]["body"]
          >;

          query?: RequestSchema<
            ResolveRoute<FetchAPI<K>, R>["requestInput"]["query"]
          >;
        };
  };
};

type RequestSchema<T> = [T] extends [never]
  ? never
  : unknown extends T
    ? never
    : T extends object
      ? ZodShape<T>
      : ZodField<T>;

const lang = z.enum(languagesSupported).default("en");
const page = z.coerce.number().optional().default(1);
const deviceId = z.string().min(10, "Invalid device ID");
const notificationToken = z.string().min(3, "Invalid notification token");

export const SCHEMAS: APIInput = {
  GET: {
    "/info/health": {},
    "/info/generate204": {},
    "/info/appAlive/:deviceId/:pushToken": {
      params: { deviceId, pushToken: z.string().min(10) },
    },
    "/cryptos/": {},
    "/cryptos/:symbol": {
      params: { symbol: z.string().toUpperCase() },
    },
    "/cryptos/price/:symbol": {
      params: { symbol: z.string().toUpperCase() },
    },
    "/clipboard/:deviceId{/:page}": {
      params: { page, deviceId },
      query: {
        query: z.string().optional(),
        deleted: z.coerce.boolean().optional().default(false),
      },
    },
    "/logs/": {},
    "/logs/page{/:page}": {
      params: { page },
    },
    "/streamers/": {},
    "/streamers/:userId{/:streamerId}": {
      params: {
        userId: z.uuid(),
        streamerId: z.uuid().optional(),
      },
    },
    "/streamers/page{/:page}": {
      params: { page },
    },
    "/streamers/streamer/:streamerId": { params: { streamerId: z.uuid() } },
    "/down-detector/:deviceId{/:page}": {
      params: { page, deviceId },
    },
    "/updates/download/:id": { params: { id: z.string() } },
    "/updates/is-update-available/:version/:buildType": {
      params: {
        version: z.string().includes("."),
        buildType: z.enum(["web", "linux", "android", "windows"]),
      },
    },
  },
  PUT: {
    "/clipboard/delete/toggle-deleted": {
      body: {
        deviceId,
        id: z.union([z.uuid(), z.array(z.uuid())]),
        deleted: z.boolean().optional(),
      },
    },
    "/clipboard/delete/toggle-deleted-all": {
      body: {
        deviceId,
        restore: z.boolean().optional().default(false),
      },
    },
    "/down-detector/update": {
      body: {
        deviceId,
        id: z.uuid(),
        values: z.object({
          url: z.url().optional(),
          sendNotification: z.boolean().optional(),
        } satisfies Record<
          Exclude<
            keyof Prisma.DownDetectorUpdateInput,
            "id" | "user" | "createdAt"
          >,
          unknown
        >),
      },
    },
    "/user-config/update": {
      body: {
        deviceId,
        values: z.object({
          theme: z.enum(["light", "dark", "auto"] as Theme[]).optional(),
          API_URL: z.url().optional(),
          hasAdmin: z.never(),
          language: z.enum(languagesSupported).optional(),
          webSocketURL: z.url().optional(),
        } satisfies Record<
          Exclude<
            keyof Prisma.UserConfigUpdateInput,
            "id" | "user" | "createdAt" | "updatedAt"
          >,
          unknown
        >),
      },
    },
    "/user-notifications-config/update": {
      body: {
        deviceId,
        values: z.object({
          paused: z.boolean().optional(),
          reason: z.enum(reasonNotification).optional(),
          enabled: z.boolean().optional(),
          pauseTime: z.coerce.number().optional(),
        } satisfies Record<
          Exclude<
            keyof Prisma.UserNotificationsConfigUpdateInput,
            "id" | "user" | "createdAt" | "updatedAt" | "streamers"
          >,
          unknown
        >),
        match: z.object({
          reason: z.enum(reasonNotification).optional(),
          paused: z.coerce.boolean().optional(),
          enabled: z.coerce.boolean().optional(),
          updatedAt: z.coerce.date().optional(),
          pauseTime: z.coerce.number().optional(),
        } satisfies Record<
          Exclude<
            keyof Prisma.UserNotificationsConfigWhereInput,
            | "id"
            | "OR"
            | "AND"
            | "NOT"
            | "user"
            | "userId"
            | "createdAt"
            | "streamers"
          >,
          unknown
        >),
      },
    },
  },
  POST: {
    "/updates/upload": {},
    "/dev/executeQuery": {
      body: { value: z.string(), showFields: z.boolean().optional() },
    },

    "/admin/unlock": {
      body: {
        deviceId,
        password: z
          .string()
          .min(8, "Password must be at least 8 characters long"),
      },
    },
    "/auth/login": {
      body: {
        lang,
        deviceId,
        notificationToken,
        email: z.email("Invalid email address"),
        password: z.string().min(12, "Invalid password"),
        rememberMe: z.boolean("Invalid remember me"),
      },
    },
    "/auth/signup": {
      body: {
        lang,
        email: z.email("Invalid email address"),
        password: z
          .string()
          .min(12, "Password must be at least 8 characters long")
          .max(128, "Password must be less than 128 characters long")
          .regex(/\d/, "Password must contain at least one number")
          .regex(/[a-z]/, "Password must contain at least one lowercase letter")
          .regex(/[A-Z]/, "Password must contain at least one uppercase letter")
          .regex(
            /[!@#$%^&*()_+\-=[\]{};':"\\|,.<>/?]/,
            "Password must contain at least one special character",
          ),
      },
    },
    "/auth/refreshSession": {
      body: {
        lang,
        deviceId,
        notificationToken,
      },
    },
    "/auth/signout": {
      body: {
        lang,
        deviceId,
      },
    },
    "/clipboard/add": {
      body: {
        deviceId,
        content: z.string().min(1, "Invalid content"),
      },
    },
    "/down-detector/add": {
      body: {
        deviceId,
        values: z.object({
          url: z.url(),
          sendNotification: z.boolean().optional().default(false),
        } satisfies Record<
          Exclude<
            keyof Prisma.DownDetectorCreateInput,
            "id" | "user" | "createdAt"
          >,
          unknown
        >),
      },
    },
    "/encryption/decrypt": {
      body: { value: z.string().min(1, "Invalid value") },
    },
    "/encryption/encrypt": {
      body: { value: z.string().min(1, "Invalid value") },
    },
    "/images/change-format": {
      body: {
        lang,
        format: z.string(),
        imageStr: z.base64("Invalid base64"),
      },
    },
    "/languages/translate": {
      body: {
        targetLanguage: z.string().min(1, "Invalid target language"),
        text: z.string().min(1, "Invalid text"),
      },
    },
    "/logs/add": {
      body: {
        deviceId,
        deviceName: z
          .string()
          .min(3, "Device name must be at least 3 characters long"),
        type: z.enum(["log", "error", "warn"] as Enums["LogType"][]),
        userId: z.uuid(),
        message: z.string().min(1, "Invalid message"),
        timestamp: z.coerce.date(),

        id: z.never().optional(),
        user: z.never().optional(),
      },
    },
    "/streamers/add": {
      body: {
        deviceId,
        userId: z.uuid(),
        streamerName: z.string().min(1, "Invalid streamer name"),
      },
    },
  },
  DELETE: {
    "/down-detector/:deviceId/:downDetectorId": {
      params: {
        deviceId,
        downDetectorId: z.uuid(),
      },
    },
    "/logs/:logId": {
      params: { logId: z.uuid() },
    },
    "/streamers/:deviceId/:streamerId": {
      params: {
        deviceId,
        streamerId: z.uuid(),
      },
    },
  },
};
