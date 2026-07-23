import {
  AnyMatcher,
  TestRoutes,
  AnythingMatcher,
  ObjectContainingMatcher,
} from "./types";
import path from "path";
import { user } from "../utils.ts";
import { prisma } from "@/database/postgres";
import { randomUUID } from "crypto";
import { serverPath } from "@/config";
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
    "/info/appAlive/:deviceId-string/:pushToken-string": [],
    "/updates/download/:id": [],

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
        requestBody: { symbol: "BTCUSDT" },
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
        requestBody: { symbol: "NonValidSymbol" },
        description: "Should return an error for an invalid crypto symbol",
        shouldSucceed: false,
        expectedResponse: {
          error: expect.any(String),
        },
      },
    ],
    "/cryptos/price/:symbol": [
      {
        requestBody: { symbol: "ETHUSDT" },
        shouldSucceed: true,
        expectedResponse: { price: expect.any(Number) },
        description:
          "Should fetch the price of a specific crypto successfully using price route",
      },
      {
        requestBody: { symbol: "NonValidSymbol" },
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
    "/logs/page": [
      {
        auth: user.getSessionToken,
        description: "Should fetch a page of logs successfully",
        shouldSucceed: true,
        expectedResponse: { logs: expect.any(Array) },
      },
      {
        auth: "InvalidToken",
        description:
          "Should return an error when fetching a page of logs with invalid auth",
        shouldSucceed: false,
        expectedResponse: { error: expect.any(String) },
      },
    ],
    "/logs/page/:page-number-optional": [
      {
        auth: user.getSessionToken,
        requestBody: { page: 1 },
        description: "Should fetch a page of logs successfully",
        shouldSucceed: true,
        expectedResponse: { logs: expect.any(Array) },
      },
      {
        auth: "InvalidToken",
        description:
          "Should return an error when fetching a page of logs with invalid auth",
        requestBody: { page: 1 },
        shouldSucceed: false,
        expectedResponse: { error: expect.any(String) },
      },
    ],
    "/streamers/page": [
      {
        description: "Should fetch a page of streamers successfully",
        shouldSucceed: true,
        expectedResponse: { streamers: expect.any(Array) },
      },
    ],
    "/streamers/page/:page-number-optional": [
      {
        requestBody: { page: 1 },
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
        requestBody: async () => {
          const streamer = await prisma.streamers.findFirst();

          if (!streamer) {
            throw new Error(
              "No streamers found in the database. Please ensure there are streamers in the database for this test.",
            );
          }

          return { streamerId: streamer.id };
        },
      },
      {
        description: "Should not fetch a streamer by ID with invalid ID",
        shouldSucceed: false,
        expectedResponse: { error: expect.any(String) },
        requestBody: { streamerId: "invalid-streamer-id" },
      },
    ],
    "/streamers/:userId": [
      {
        description: "Should fetch streamers by user ID successfully",
        shouldSucceed: true,
        expectedResponse: { streamers: expect.any(Array) },
        requestBody: async () => {
          const userData = user.getUserData();
          const userId = userData.user?.userId;

          if (!userId) {
            throw new Error(
              "User ID not found in session data. Please ensure the user is logged in for this test.",
            );
          }

          return { userId };
        },
      },
      {
        requestBody: { userId: "invalid-user-id" },
        description: "Should not fetch streamers by user ID with invalid ID",
        shouldSucceed: false,
        expectedResponse: { error: expect.any(String) },
      },
    ],
    "/streamers/:userId/:streamerId-optional": [
      {
        description:
          "Should fetch streamers by user ID and optional streamer ID successfully",
        shouldSucceed: true,
        expectedResponse: { streamers: expect.any(Array) },
        requestBody: async () => {
          const userData = user.getUserData();
          const userId = userData.user?.userId;

          if (!userId) {
            throw new Error(
              "User ID not found in session data. Please ensure the user is logged in for this test.",
            );
          }

          const streamer = await prisma.userStreamers.findFirst({
            where: { userId },
            include: { streamer: true },
          });

          return { userId, streamerId: streamer?.id || "" };
        },
      },
      {
        description:
          "Should not fetch streamers by user ID and optional streamer ID with invalid IDs",
        shouldSucceed: false,
        expectedResponse: { error: expect.any(String) },
        requestBody: {
          userId: "invalid-user-id",
          streamerId: "invalid-streamer-id",
        },
      },
    ],
    "/streamers/add/:userId/:streamerName": [
      {
        description: "Should add a streamer successfully for a user",
        shouldSucceed: true,
        expectedResponse: { streamer: expect.any(Object) },
        requestBody: async () => {
          const userData = user.getUserData();
          const userId = userData.user?.userId;

          if (!userId) {
            throw new Error(
              "User ID not found in session data. Please ensure the user is logged in for this test.",
            );
          }

          return { userId, streamerName: "ElMariana" };
        },
      },
      {
        description:
          "Should not add a streamer successfully for a user with invalid user ID",
        shouldSucceed: false,
        expectedResponse: { error: expect.any(String) },
        requestBody: {
          userId: "invalid-user-id",
          streamerName: "invalid-streamer-name",
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
        requestBody: {
          buildType: "android",
          version: "0.0.0",
        },
      },
    ],
    "/updates/is-update-available/:version/:buildType/:platform-optional": [
      {
        description: "Should fetch successfully",
        shouldSucceed: true,
        expectedResponse: {
          latestVersion: expect.any(String),
          isUpdateAvailable: expect.any(Boolean),
        },
        requestBody: {
          version: "0.0.0",
          platform: "linux",
          buildType: "electron",
        },
      },
    ],
  },

  POST: {
    "/updates/upload": [],
    "/dev/executeQuery": [],
    "/images/change-format": [
      {
        description: "Should change image format successfully",
        shouldSucceed: true,
        expectedResponse: { success: true },
        requestBody: async () => {
          const imageStr = await readImage(
            path.join(serverPath, "dev/testingRoutes/sample.jpeg"),
          );

          return { imageStr, lang: "en", format: "png" };
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
        requestBody: {
          lang: "en",
          email: user.email,
          password: user.password,
          deviceId: user.deviceId,
          rememberMe: false,
          notificationToken: "Web",
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
        requestBody: {
          lang: "en",
          email: user.email,
          password: "wrong-password",
          deviceId: "test-device-id",
          rememberMe: false,
          notificationToken: "Web",
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
        requestBody: () => ({
          lang: "en",
          deviceId: user.deviceId,
          notificationToken: "Web",
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
        requestBody: {
          lang: "en",
          deviceId: "test-device-id",
          notificationToken: "Web",
        },
      },
    ],
    "/auth/signout": [
      {
        auth: user.getSessionToken,
        requestBody: { deviceId: user.deviceId, lang: "en" },
        description: "Should sign out successfully with valid token",
        shouldSucceed: true,
        expectedResponse: { success: true },
      },
      {
        auth: "InvalidToken",
        requestBody: { deviceId: "test-device-id", lang: "en" },
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
        requestBody: {
          lang: "en",
          email: `user${Date.now()}@test.test`,
          password: "Test123!",
        },
      },
      {
        description: "Should not sign up with invalid credentials",
        shouldSucceed: false,
        expectedResponse: { error: expect.any(String) },
        requestBody: {
          lang: "en",
          email: "invalid-email",
          password: "invalid-password",
        },
      },
    ],
    "/encryption/encrypt": [
      {
        description: "Should encrypt successfully with valid data",
        expectedResponse: { value: expect.any(String) },
        shouldSucceed: true,
        requestBody: () => ({ value: decryptedValue }),
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
        requestBody: { value: undefined as unknown as string },
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
        requestBody: () => ({ value: getEncryptedValue() }),
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
        requestBody: () => ({ value: "invalid-encrypted-value" }),
      },
    ],
    "/languages/translate": [
      {
        description: "Should translate text successfully with valid data",
        shouldSucceed: true,
        expectedResponse: { translatedText: expect.any(String) },
        requestBody: { text: "Hello", targetLanguage: "es" },
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
        requestBody: { text: "", targetLanguage: "es" },
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
        requestBody: {
          type: "log",
          message: "Test log message",
          deviceId: "test-device-id",
          timestamp: new Date().toISOString(),
          deviceName: "Test Device",
        },
      },
      {
        description: "Should add a log successfully with valid data and userId",
        shouldSucceed: true,
        expectedResponse: { success: true },
        requestBody: () => ({
          type: "log",
          userId: user.getUserData().user?.userId,
          message: "Test log message",
          deviceId: user.deviceId,
          timestamp: new Date().toISOString(),
          deviceName: "Test Device",
        }),
      },
    ],
  },

  PUT: { "/logs/": [] },

  DELETE: {
    "/logs/:logId": [
      {
        auth: user.getSessionToken,
        description: "Should delete a log successfully with valid logId",
        requestBody: async () => {
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

          return { logId: logs.filter((log) => !!log.id)[0]?.id };
        },
        shouldSucceed: true,
        expectedResponse: { success: true },
      },
      {
        auth: user.getSessionToken,
        description: "Should not delete a log with invalid logId",
        requestBody: { logId: "invalid-log-id" },
        shouldSucceed: false,
        expectedResponse: { error: expect.any(String) },
      },
    ],
  },
};
