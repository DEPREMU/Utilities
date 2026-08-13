import {
  AnyMatcher,
  TestRoutes,
  AnythingMatcher,
  ObjectContainingMatcher,
} from "./types";
import path from "path";
import { user } from "../utils.ts";
import { prisma } from "@/database/postgres";
import { getRoutes } from "@/config";
import { randomUUID } from "crypto";
import { getEnvValue } from "@/env.ts";
import { readImage, PriceBinanceAPI, STATUS_RESPONSE } from "@common";

export const expect = {
  any: (constructor: unknown): AnyMatcher => ({ __type: "any", constructor }),
  anything: (): AnythingMatcher => ({ __type: "anything" }),
  objectContaining: <T>(
    obj: T extends Array<infer U>
      ? Array<
          U extends object
            ? {
                [K in keyof U]?:
                  U[K] | AnyMatcher | AnythingMatcher | ObjectContainingMatcher;
              }
            : U | AnyMatcher | AnythingMatcher | ObjectContainingMatcher
        >
      : {
          [K in keyof T]?:
            T[K] | AnyMatcher | AnythingMatcher | ObjectContainingMatcher;
        },
  ): ObjectContainingMatcher<T> => ({
    __type: "objectContaining",
    obj: obj as never,
  }),
};

const decryptedValue = randomUUID();
let encryptedValue: string | null = null;

const getEncryptedValue = (): string => {
  if (encryptedValue) return encryptedValue;

  throw new Error(
    "Encrypted value not set. Please run the decryption test case first to set it.",
  );
};

export const testCases: TestRoutes = {
  GET: {
    "/info/appAlive/:deviceId/:pushToken": [],
    "/updates/download/:id": [],
    "/down-detector/:deviceId{/:page}": [
      {
        auth: user.getSessionToken,
        description: "Should fetch down-detector status successfully",
        shouldSucceed: true,
        expectedResponse: { downDetectors: expect.any(Object) },
        requestInput: { params: { deviceId: user.deviceId } },
      },
      {
        auth: "InvalidToken",
        description:
          "Should return an error when fetching down-detector status with invalid auth",
        shouldSucceed: false,
        expectedResponse: { error: expect.any(String) },
        requestInput: { params: { deviceId: user.deviceId } },
      },
    ],
    "/clipboard/search/:deviceId/:query{/:page}": [
      {
        auth: user.getSessionToken,
        description:
          "Should search clipboard entries successfully with valid auth",
        shouldSucceed: true,
        expectedResponse: { clipboardItems: expect.any(Array) },
        requestInput: async () => {
          const deviceId = user.deviceId;
          const userId = user.getUserData().user?.userId;

          if (!userId)
            throw new Error(
              "User ID not found in session data. Please ensure the user is logged in for this test.",
            );

          const uuid = randomUUID();

          const entry = await prisma.clipboardSync.create({
            data: {
              userId,
              deviceId,
              content: `${uuid} Test clipboard content`,
            },
          });

          return {
            query: { deleted: false },
            params: { deviceId, query: entry.content.slice(0, uuid.length) },
          };
        },
      },
      {
        auth: "InvalidToken",
        description:
          "Should return an error when searching clipboard entries with invalid auth",
        shouldSucceed: false,
        expectedResponse: { error: expect.any(String) },
        requestInput: async () => {
          const deviceId = user.deviceId;

          const entries = await prisma.clipboardSync.findMany({
            where: { deviceId },
          });

          if (!entries || entries.length === 0) {
            throw new Error(
              "No clipboard entries found for the user. Please ensure there are clipboard entries in the database for this test.",
            );
          }

          return {
            params: {
              deviceId,
              query: entries[0].content,
            },
            query: { deleted: false },
          };
        },
      },
    ],
    "/clipboard/:deviceId{/:page}": [
      {
        auth: user.getSessionToken,
        description: "Should fetch clipboard entries successfully",
        shouldSucceed: true,
        expectedResponse: { clipboardItems: expect.any(Array) },
        requestInput: async () => {
          const deviceId = user.deviceId;

          const entries = await prisma.clipboardSync.findMany({
            where: { deviceId },
          });

          if (!entries || entries.length === 0) {
            throw new Error(
              "No clipboard entries found for the user. Please ensure there are clipboard entries in the database for this test.",
            );
          }

          return { params: { deviceId } };
        },
      },
      {
        auth: "InvalidToken",
        description:
          "Should return an error when fetching clipboard entries with invalid auth",
        shouldSucceed: false,
        expectedResponse: { error: expect.any(String) },
        requestInput: async () => {
          const deviceId = user.deviceId;

          const entries = await prisma.clipboardSync.findMany({
            where: { deviceId },
          });

          if (!entries || entries.length === 0) {
            throw new Error(
              "No clipboard entries found for the user. Please ensure there are clipboard entries in the database for this test.",
            );
          }

          return { params: { deviceId } };
        },
      },
    ],
    "/cryptos/": [
      {
        description: "Should fetch the list of cryptos successfully",
        shouldSucceed: true,
        expectedResponse: {
          cryptos: expect.objectContaining<PriceBinanceAPI>([
            { symbol: expect.any(String), price: expect.any(Number) },
          ]),
        },
      },
    ],
    "/cryptos/:symbol": [
      {
        requestInput: { params: { symbol: "BTCUSDT" } },
        description: "Should fetch the price of a specific crypto successfully",
        shouldSucceed: true,
        expectedResponse: {
          crypto: expect.objectContaining<PriceBinanceAPI>([
            {
              symbol: "BTCUSDT",
              price: expect.any(Number),
            },
          ]),
        },
      },
      {
        requestInput: { params: { symbol: "NonValidSymbol" } },
        description: "Should return an error for an invalid crypto symbol",
        shouldSucceed: false,
        expectedResponse: {
          error: expect.any(String),
        },
      },
    ],
    "/cryptos/price/:symbol": [
      {
        requestInput: { params: { symbol: "ETHUSDT" } },
        shouldSucceed: true,
        expectedResponse: { price: expect.any(Number) },
        description:
          "Should fetch the price of a specific crypto successfully using price route",
      },
      {
        requestInput: { params: { symbol: "NonValidSymbol" } },
        shouldSucceed: false,
        expectedResponse: { error: expect.any(String) },
        description:
          "Should return an error for an invalid crypto symbol using price route",
      },
    ],
    "/info/generate204": [
      {
        description:
          "Should return a 204 status code for the generate204 route",
        shouldSucceed: (status: number) =>
          status === STATUS_RESPONSE.NO_CONTENT,
        expectedResponse: "",
      },
    ],
    "/info/health": [
      {
        description: "Should return a successful health status",
        shouldSucceed: true,
        expectedResponse: {
          upTime: expect.any(Number),
          timestamp: expect.any(String),
        },
      },
    ],
    "/logs/": [
      {
        auth: user.getSessionToken,
        description: "Should fetch the list of logs successfully",
        shouldSucceed: true,
        expectedResponse: { logs: expect.any(Array) },
      },
      {
        auth: "InvalidToken",
        description:
          "Should return an error when fetching logs with invalid auth",
        shouldSucceed: false,
        expectedResponse: { error: expect.any(String) },
      },
    ],
    "/logs/page{/:page}": [
      {
        auth: user.getSessionToken,
        description: "Should fetch a page of logs successfully",
        shouldSucceed: true,
        expectedResponse: { logs: expect.any(Array) },
        requestInput: {},
      },
      {
        auth: "InvalidToken",
        description:
          "Should return an error when fetching a page of logs with invalid auth",
        shouldSucceed: false,
        expectedResponse: { error: expect.any(String) },
        requestInput: {},
      },
      {
        auth: user.getSessionToken,
        requestInput: { params: { page: 1 } },
        description: "Should fetch a page of logs successfully",
        shouldSucceed: true,
        expectedResponse: { logs: expect.any(Array) },
      },
      {
        auth: "InvalidToken",
        description:
          "Should return an error when fetching a page of logs with invalid auth",
        requestInput: { params: { page: 1 } },
        shouldSucceed: false,
        expectedResponse: { error: expect.any(String) },
      },
    ],
    "/streamers/page{/:page}": [
      {
        description: "Should fetch a page of streamers successfully",
        shouldSucceed: true,
        expectedResponse: { streamers: expect.any(Array) },
        requestInput: {},
      },
      {
        requestInput: { params: { page: 1 } },
        description: "Should fetch a page of streamers successfully",
        shouldSucceed: true,
        expectedResponse: { streamers: expect.any(Array) },
      },
    ],
    "/streamers/": [
      {
        description: "Should fetch the list of streamers successfully",
        shouldSucceed: true,
        expectedResponse: { streamers: expect.any(Array) },
      },
    ],
    "/streamers/streamer/:streamerId": [
      {
        description: "Should fetch a streamer by ID successfully",
        shouldSucceed: true,
        expectedResponse: { streamer: expect.any(Object) },
        requestInput: async () => {
          const streamer = await prisma.streamers.findFirst();

          if (!streamer) {
            throw new Error(
              "No streamers found in the database. Please ensure there are streamers in the database for this test.",
            );
          }

          return { params: { streamerId: streamer.id } };
        },
      },
      {
        description: "Should not fetch a streamer by ID with invalid ID",
        shouldSucceed: false,
        expectedResponse: { error: expect.any(String) },
        requestInput: { params: { streamerId: "invalid-streamer-id" } },
      },
    ],
    "/streamers/:userId{/:streamerId}": [
      {
        description: "Should fetch streamers by user ID successfully",
        shouldSucceed: true,
        expectedResponse: { streamers: expect.any(Array) },
        requestInput: async () => {
          const userData = user.getUserData();
          const userId = userData.user?.userId;

          if (!userId) {
            throw new Error(
              "User ID not found in session data. Please ensure the user is logged in for this test.",
            );
          }

          return { params: { userId } };
        },
      },
      {
        description: "Should not fetch streamers by user ID with invalid ID",
        shouldSucceed: false,
        expectedResponse: { error: expect.any(String) },
        requestInput: { params: { userId: "invalid-user-id" } },
      },
      {
        description:
          "Should fetch streamers by user ID and optional streamer ID successfully",
        shouldSucceed: true,
        expectedResponse: { streamers: expect.any(Array) },
        requestInput: async () => {
          const userData = user.getUserData();
          const userId = userData.user?.userId;

          if (!userId) {
            throw new Error(
              "User ID not found in session data. Please ensure the user is logged in for this test.",
            );
          }

          return { params: { userId } };
        },
      },
      {
        description: "Should fetch streamers by user ID successfully",
        shouldSucceed: true,
        expectedResponse: { streamers: expect.any(Array) },
        requestInput: async () => {
          const userData = user.getUserData();
          const userId = userData.user?.userId;

          if (!userId) {
            throw new Error(
              "User ID not found in session data. Please ensure the user is logged in for this test.",
            );
          }

          return { params: { userId } };
        },
      },
    ],
    "/updates/is-update-available/:version/:buildType": [
      {
        description: "Should fetch successfully",
        shouldSucceed: true,
        expectedResponse: {
          latestVersion: expect.any(String),
          isUpdateAvailable: expect.any(Boolean),
        },
        requestInput: {
          params: {
            buildType: "android",
            version: "0.0.0",
          },
        },
      },
      {
        description: "Should fetch successfully",
        shouldSucceed: true,
        expectedResponse: {
          latestVersion: expect.any(String),
          isUpdateAvailable: expect.any(Boolean),
        },
        requestInput: {
          params: {
            version: "0.0.0",
            buildType: "linux",
          },
        },
      },
    ],
  },

  POST: {
    "/updates/upload": [],
    "/dev/executeQuery": [],
    "/admin/unlock": [
      {
        auth: user.getSessionToken,
        description:
          "Should unlock admin access successfully with valid password",
        shouldSucceed: true,
        expectedResponse: { success: true },
        requestInput: {
          body: {
            deviceId: user.deviceId,
            password: getEnvValue("ADMIN_PASSWORD"),
          },
        },
      },
      {
        auth: "InvalidToken",
        description:
          "Should not unlock admin access successfully with invalid token",
        shouldSucceed: false,
        expectedResponse: { error: expect.any(String) },
        requestInput: {
          body: {
            deviceId: user.deviceId,
            password: getEnvValue("ADMIN_PASSWORD"),
          },
        },
      },
    ],

    "/clipboard/add": [
      {
        auth: user.getSessionToken,
        description: "Should add a clipboard entry successfully",
        shouldSucceed: true,
        expectedResponse: { id: expect.any(String) },
        requestInput: async () => {
          const userData = user.getUserData();
          const userId = userData.user?.userId;

          if (!userId) {
            throw new Error(
              "User ID not found in session data. Please ensure the user is logged in for this test.",
            );
          }

          return {
            body: {
              userId,
              deviceId: user.deviceId,
              content: "Test clipboard content",
            },
          };
        },
      },
      {
        auth: "InvalidToken",
        description:
          "Should not add a clipboard entry successfully with invalid token",
        shouldSucceed: false,
        expectedResponse: { error: expect.any(String) },
        requestInput: {
          body: {
            content: "Test clipboard content",
            deviceId: user.deviceId,
          },
        },
      },
    ],
    "/down-detector/add": [
      {
        auth: user.getSessionToken,
        description: "Should add a down-detector entry successfully",
        shouldSucceed: true,
        expectedResponse: { id: expect.any(String) },
        requestInput: async () => {
          const userData = user.getUserData();
          const userId = userData.user?.userId;

          if (!userId) {
            throw new Error(
              "User ID not found in session data. Please ensure the user is logged in for this test.",
            );
          }

          return {
            body: {
              userId,
              deviceId: user.deviceId,
              values: {
                url: "https://example.com",
                sendNotification: Math.random() < 0.5,
              },
            },
          };
        },
      },
      {
        auth: "InvalidToken",
        description:
          "Should not add a down-detector entry successfully with invalid token",
        shouldSucceed: false,
        expectedResponse: { error: expect.any(String) },
        requestInput: {
          body: {
            deviceId: user.deviceId,
            values: {
              url: "https://example.com",
              sendNotification: Math.random() < 0.5,
            },
          },
        },
      },
    ],
    "/streamers/add": [
      {
        description: "Should add a streamer successfully for a user",
        shouldSucceed: true,
        expectedResponse: { streamer: expect.any(Object) },
        requestInput: async () => {
          const userData = user.getUserData();
          const userId = userData.user?.userId;

          if (!userId) {
            throw new Error(
              "User ID not found in session data. Please ensure the user is logged in for this test.",
            );
          }

          return {
            body: {
              userId,
              streamerName: "ElMariana",
              deviceId: user.deviceId,
            },
          };
        },
        auth: user.getSessionToken,
      },
      {
        auth: user.getSessionToken,
        description:
          "Should not add a streamer successfully for a user with invalid user ID",
        shouldSucceed: false,
        expectedResponse: { error: expect.any(String) },
        requestInput: {
          body: {
            userId: "invalid-user-id",
            deviceId: user.deviceId,
            streamerName: "invalid-streamer-name",
          },
        },
      },
    ],
    "/images/change-format": [
      {
        description: "Should change image format successfully",
        shouldSucceed: true,
        expectedResponse: { success: true },
        requestInput: async () => {
          const imageStr = await readImage(
            path.join(getRoutes("ROOT"), "dev/testingRoutes/sample.jpeg"),
          );

          return { body: { imageStr, lang: "en", format: "png" } };
        },
      },
    ],

    "/auth/login": [
      {
        description: "Should login successfully with valid credentials",
        shouldSucceed: true,
        expectedResponse: {
          token: expect.any(String),
        },
        requestInput: {
          body: {
            lang: "en",
            email: user.email,
            password: user.password,
            deviceId: user.deviceId,
            rememberMe: false,
            notificationToken: "Web",
          },
        },
        onFinish: (res) => {
          if (!res)
            throw new Error(
              "Login failed during test setup: No response received",
            );

          const { success: _0, error, ...rest } = res;

          if (error) {
            throw new Error(`Login failed during test setup: ${error}`);
          }

          user.setUserData(rest);
        },
      },
      {
        description: "Should not login with invalid credentials",
        shouldSucceed: false,
        expectedResponse: {
          error: expect.any(String),
        },
        requestInput: {
          body: {
            lang: "en",
            email: user.email,
            password: "wrong-password",
            deviceId: "test-device-id",
            rememberMe: false,
            notificationToken: "Web",
          },
        },
      },
    ],
    "/auth/refreshSession": [
      {
        description: "Should refresh session successfully with valid token",
        shouldSucceed: true,
        expectedResponse: {
          token: expect.any(String),
        },
        requestInput: () => ({
          body: {
            lang: "en",
            deviceId: user.deviceId,
            notificationToken: "Web",
          },
        }),
        onFinish: (res) => {
          if (!res)
            throw new Error(
              "Refresh session failed during test setup: No response",
            );

          const { success: _0, error, ...rest } = res;

          if (error) {
            throw new Error(
              `Refresh session failed during test setup: ${error}`,
            );
          }

          user.setUserData(rest);
        },
        auth: user.getSessionToken,
      },
      {
        auth: "InvalidToken",
        description: "Should not refresh session with invalid token",
        shouldSucceed: false,
        expectedResponse: {
          error: expect.any(String),
        },
        requestInput: {
          body: {
            lang: "en",
            deviceId: "test-device-id",
            notificationToken: "Web",
          },
        },
      },
    ],
    "/auth/signout": [
      {
        auth: user.getSessionToken,
        requestInput: { body: { deviceId: user.deviceId, lang: "en" } },
        description: "Should sign out successfully with valid token",
        shouldSucceed: true,
        expectedResponse: { success: true },
      },
      {
        auth: "InvalidToken",
        requestInput: { body: { deviceId: "test-device-id", lang: "en" } },
        description: "Should not sign out successfully with invalid token",
        shouldSucceed: false,
        expectedResponse: { error: expect.any(String) },
      },
    ],
    "/auth/signup": [
      {
        description: "Should sign up successfully with valid credentials",
        shouldSucceed: true,
        expectedResponse: { success: true },
        requestInput: {
          body: {
            lang: "en",
            email: `user${Date.now()}@test.test`,
            password: "Test123!",
          },
        },
      },
      {
        description: "Should not sign up with invalid credentials",
        shouldSucceed: false,
        expectedResponse: { error: expect.any(String) },
        requestInput: {
          body: {
            lang: "en",
            email: "invalid-email",
            password: "invalid-password",
          },
        },
      },
    ],
    "/encryption/encrypt": [
      {
        description: "Should encrypt successfully with valid data",
        expectedResponse: { value: expect.any(String) },
        shouldSucceed: true,
        requestInput: () => ({ body: { value: decryptedValue } }),
        onFinish: (res) => {
          if (!res)
            throw new Error(
              "Encryption failed during test setup: No response received",
            );

          const { value } = res;
          if (typeof value !== "string")
            throw new Error(
              "Encryption failed during test setup: Invalid response",
            );

          encryptedValue = value;
        },
      },
      {
        requestInput: { body: { value: undefined as unknown as string } },
        description: "Should not encrypt with invalid data",
        shouldSucceed: false,
        expectedResponse: { error: expect.any(String) },
      },
    ],
    "/encryption/decrypt": [
      {
        description: "Should decrypt successfully with valid data",
        shouldSucceed: true,
        expectedResponse: { value: expect.any(String) },
        requestInput: () => ({ body: { value: getEncryptedValue() } }),
        onFinish: (res) => {
          if (!res)
            throw new Error(
              "Decryption failed during test setup: No response received",
            );

          const { value } = res;

          if (typeof value !== "string" || value !== decryptedValue)
            throw new Error(
              "Decryption failed during test setup: Decrypted value does not match original",
            );
        },
      },
      {
        description: "Should not decrypt with invalid data",
        shouldSucceed: false,
        expectedResponse: { error: expect.any(String) },
        requestInput: { body: { value: "invalid-encrypted-value" } },
      },
    ],
    "/languages/translate": [
      {
        description: "Should translate text successfully with valid data",
        shouldSucceed: true,
        expectedResponse: { translatedText: expect.any(String) },
        requestInput: { body: { text: "Hello", targetLanguage: "es" } },
        onFinish: (res) => {
          if (!res)
            throw new Error(
              "Translation failed during test setup: No response received",
            );

          const { translatedText } = res;
          if (
            typeof translatedText !== "string" ||
            translatedText.toLowerCase() !== "hola"
          )
            throw new Error(
              "Translation failed during test setup: Translated text does not match expected",
            );
        },
      },
      {
        requestInput: { body: { text: "", targetLanguage: "es" } },
        description: "Should not translate text with invalid data",
        shouldSucceed: false,
        expectedResponse: { error: expect.any(String) },
      },
    ],
    "/logs/add": [
      {
        description: "Should add a log successfully with valid data",
        shouldSucceed: true,
        expectedResponse: { success: true },
        requestInput: {
          body: {
            type: "log",
            message: "Test log message",
            deviceId: "test-device-id",
            timestamp: new Date().toISOString(),
            deviceName: "Test Device",
          },
        },
      },
      {
        description: "Should add a log successfully with valid data and userId",
        shouldSucceed: true,
        expectedResponse: { success: true },
        requestInput: () => ({
          body: {
            type: "log",
            userId: user.getUserData().user?.userId,
            message: "Test log message",
            deviceId: user.deviceId,
            timestamp: new Date().toISOString(),
            deviceName: "Test Device",
          },
        }),
      },
    ],
  },

  PUT: {
    "/clipboard/delete/toggle-deleted": [
      {
        auth: user.getSessionToken,
        description:
          "Should toggle the deleted status of a clipboard entry successfully",
        shouldSucceed: true,
        expectedResponse: {},
        requestInput: async () => {
          const clipboardEntry = await prisma.clipboardSync.findFirst({
            where: { deviceId: user.deviceId },
          });

          if (!clipboardEntry) {
            throw new Error(
              "No clipboard entry found for the user to toggle. Please ensure there is a clipboard entry in the database for this test.",
            );
          }

          return {
            body: {
              id: clipboardEntry.id || "",
              deviceId: user.deviceId,
            },
          };
        },
      },
    ],
    "/clipboard/delete/toggle-deleted-all": [
      {
        auth: user.getSessionToken,
        description:
          "Should toggle the deleted status of all clipboard entries successfully",
        shouldSucceed: true,
        expectedResponse: {},
        requestInput: async () => {
          return {
            body: {
              restore: Math.random() < 0.5,
              deviceId: user.deviceId,
            },
          };
        },
      },
    ],
    "/down-detector/update": [
      {
        auth: user.getSessionToken,
        description: "Should update down-detector status successfully",
        shouldSucceed: true,
        expectedResponse: {},
        requestInput: async () => {
          const deviceId = user.deviceId;

          const downDetectorEntry = await prisma.downDetector.create({
            data: {
              url: "https://example.com",
              user: { connect: { userId: user.getUserData().user?.userId } },
              sendNotification: Math.random() < 0.5,
            },
          });
          if (!downDetectorEntry)
            throw new Error(
              "No down-detector entry found for the user to update. Please ensure there is a down-detector entry in the database for this test.",
            );

          return {
            body: {
              deviceId,
              id: downDetectorEntry.id,
              values: { sendNotification: Math.random() < 0.5 },
            },
          };
        },
      },
    ],
    "/user-config/update": [
      {
        auth: user.getSessionToken,
        description: "Should update user config successfully",
        shouldSucceed: true,
        expectedResponse: { success: true },
        requestInput: async () => {
          const userData = user.getUserData();
          const userId = userData.user?.userId;

          if (!userId) {
            throw new Error(
              "User ID not found in session data. Please ensure the user is logged in for this test.",
            );
          }

          return {
            body: {
              userId,
              values: { theme: "dark" },
              deviceId: user.deviceId,
            },
          };
        },
      },
    ],
    "/user-notifications-config/update": [
      {
        auth: user.getSessionToken,
        description: "Should update user notifications config successfully",
        shouldSucceed: true,
        expectedResponse: {},
        requestInput: async () => {
          const userData = user.getUserData();
          const userId = userData.user?.userId;

          if (!userId) {
            throw new Error(
              "User ID not found in session data. Please ensure the user is logged in for this test.",
            );
          }

          return {
            body: {
              userId,
              match: { reason: "downDetector" },
              values: { enabled: Math.random() < 0.5 },
              deviceId: user.deviceId,
            },
          };
        },
      },
    ],
  },

  DELETE: {
    "/down-detector/:deviceId/:downDetectorId": [
      {
        auth: user.getSessionToken,
        description: "Should delete a down-detector entry successfully",
        shouldSucceed: true,
        expectedResponse: { success: true },
        requestInput: async () => {
          const deviceId = user.deviceId;
          const downDetectorId = await prisma.downDetector
            .create({
              data: {
                url: "https://example.com",
                user: { connect: { userId: user.getUserData().user?.userId } },
                sendNotification: Math.random() < 0.5,
              },
            })
            .then((entry) => entry?.id);

          if (!downDetectorId) {
            throw new Error(
              "No down-detector entry found for the user to delete. Please ensure there is a down-detector entry in the database for this test.",
            );
          }

          return { params: { deviceId, downDetectorId } };
        },
      },
    ],
    "/streamers/:deviceId/:streamerId": [
      {
        auth: user.getSessionToken,
        description: "Should delete a streamer successfully",
        shouldSucceed: true,
        expectedResponse: { success: true },
        requestInput: async () => {
          const deviceId = user.deviceId;
          const streamerId = await prisma.streamers
            .findFirst({
              where: {
                userStreamers: {
                  some: { user: { userId: user.getUserData().user?.userId } },
                },
              },
            })
            .then((streamer) => streamer?.id);

          if (!streamerId) {
            throw new Error(
              "No streamer found for the user to delete. Please ensure there is a streamer in the database for this test.",
            );
          }

          return { params: { deviceId, streamerId } };
        },
      },
    ],
    "/logs/:logId": [
      {
        auth: user.getSessionToken,
        description: "Should delete a log successfully with valid logId",
        requestInput: async () => {
          const logs = await prisma.logs.findMany({
            take: 5,
            where: { userId: user.getUserData().user?.userId },
          });

          let logId: string | undefined = logs.filter((log) => !!log.id)[0]?.id;

          while (!logId && logs.length > 0) {
            logId = logs.pop()?.id;
          }
          if (!logId) {
            throw new Error(
              "No logs found for the user to delete. Please ensure there are logs in the database for this test.",
            );
          }

          return { params: { logId } };
        },
        shouldSucceed: true,
        expectedResponse: { success: true },
      },
      {
        auth: user.getSessionToken,
        description: "Should not delete a log with invalid logId",
        requestInput: { params: { logId: "invalid-log-id" } },
        shouldSucceed: false,
        expectedResponse: { error: expect.any(String) },
      },
    ],
  },
};
