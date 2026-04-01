/* eslint-disable @typescript-eslint/no-explicit-any */
import {
  TestCase,
  AnyMatcher,
  AnythingMatcher,
  ObjectContainingMatcher,
} from "./types.ts";
import { encrypt } from "../routes/encryption.ts";
import { readImage } from "@common";
import { RoutesAPI, ResponseAuth, ResponseDatabaseInsert } from "@types";

/**
 * Helper object to check for missing routes at compile time
 * Usage: const missingRoute: RouteTestSuite["/some/route"]; // Will error if route doesn't exist
 */
export const expect = {
  any: (constructor: unknown): AnyMatcher => ({ __type: "any", constructor }),
  anything: (): AnythingMatcher => ({ __type: "anything" }),
  objectContaining: (obj: unknown): ObjectContainingMatcher<any> => ({
    __type: "objectContaining",
    obj,
  }),
};

const emailNew = `newuser${Date.now()}@example.com`;
const passwordNew = `SecurePassword123!${Date.now().toString(36).substring(2, 15)}`;
const deviceIdNew = `device-${Date.now()}`;

let responseAuth: ResponseAuth<"login"> | null = null;
let cryptoUidNew: string | null = null;
let logIdNew: string | null = null;

const getAuthToken = () => responseAuth?.token as string;

const getUserId = (): string => {
  const userId = responseAuth?.user?.userId;
  if (!userId) throw new Error("Auth userId not available yet");
  return userId;
};

const getCryptoUid = (): string => {
  if (!cryptoUidNew) throw new Error("Crypto uid not available yet");
  return cryptoUidNew;
};

const getLogId = (): string => {
  if (!logIdNew) throw new Error("Log id not available yet");
  return logIdNew;
};

const addDataUser = async (response: ResponseAuth<"login"> | null) => {
  if (!response?.success || !response.token)
    throw new Error(
      "Failed to add token to user: invalid response" +
        JSON.stringify(response),
    );

  responseAuth = response;
};

const storeInsertedCryptoUid = async (response: any) => {
  const uid = response?.data?.[0]?.uid;
  if (typeof uid === "string" && uid.length > 0) cryptoUidNew = uid;
};

const storeInsertedLogId = async (response: any) => {
  const data = response?.data as ResponseDatabaseInsert<"Logs">["data"];

  const id = data?.[0]?.id;
  if (typeof id === "string" && id.length > 0) logIdNew = id;
  else
    throw new Error(
      "Failed to store log id: invalid response " + JSON.stringify(response),
    );
};

const getBase64SamplePngImage = () => {
  const imageBuffer = readImage("./testingRoutes/sample.jpeg");
  return imageBuffer.toString("base64");
};

/**
 * Comprehensive test suite for all API routes
 * This array ensures type-safety: if a route is missing or doesn't have at least 3 tests,
 * TypeScript will throw a compile error
 */
export const routeTests: {
  [K in RoutesAPI]: TestCase<K>[];
} = {
  "/is-update-available": [],
  "/web-page": [],
  "/generate204": [],
  "/upload-update": [],
  "/debug/appAlive": [],
  "/download/:buildType/:version/:platformOS/:id": [],
  "/health": [
    {
      route: "/health",
      description: "Health check - should return running status",
      body: undefined,
      expectedResponse: { status: "running" },
      shouldSucceed: true,
    },
    {
      route: "/health",
      description: "Health check - should include timestamp",
      body: undefined,
      expectedResponse: { timestamp: expect.any(String) },
      shouldSucceed: true,
    },
    {
      route: "/health",
      description: "Health check - should include uptime",
      body: undefined,
      expectedResponse: { uptime: expect.any(Number) },
      shouldSucceed: true,
    },
  ],
  "/log": [
    {
      route: "/log",
      description: "Log entry - valid error log",
      body: {
        type: "error",
        message: "Test error message",
        deviceId: "device-001",
        timestamp: new Date().toISOString(),
        deviceName: "Test Device",
      },
      expectedResponse: { success: true },
      shouldSucceed: true,
    },
    {
      route: "/log",
      description: "Log entry - valid warning log",
      body: {
        type: "warn",
        message: "Test warning message",
        deviceId: "device-002",
        timestamp: new Date().toISOString(),
        deviceName: "Test Device 2",
      },
      expectedResponse: { success: true },
      shouldSucceed: true,
    },
  ],
  "/cryptos": [
    {
      route: "/cryptos",
      description: "Get cryptos - default currency (USD)",
      body: {},
      expectedResponse: { cryptos: expect.any(Array) },
      shouldSucceed: true,
    },
    {
      route: "/cryptos",
      description: "Get cryptos - with specific currency",
      body: { currency: "MXN" },
      expectedResponse: { cryptos: expect.any(Array) },
      shouldSucceed: true,
    },
    {
      route: "/cryptos",
      description: "Get cryptos - should not have error on success",
      body: {},
      expectedResponse: { error: undefined },
      shouldSucceed: true,
    },
  ],
  "/cryptoPrice": [
    {
      route: "/cryptoPrice",
      description: "Get crypto price - Bitcoin in USD",
      body: { cryptoId: "BTC", currency: "USDT" },
      expectedResponse: { priceUSD: expect.any(Number) },
      shouldSucceed: true,
    },
    {
      route: "/cryptoPrice",
      description: "Get crypto price - Ethereum in MXN",
      body: { cryptoId: "ETH", currency: "MXN" },
      expectedResponse: { priceUSD: expect.any(Number) },
      shouldSucceed: true,
    },
    {
      route: "/cryptoPrice",
      description: "Get crypto price - invalid crypto should fail",
      body: { cryptoId: "invalid-crypto-id", currency: "USDT" },
      expectedResponse: { error: expect.any(String) },
      shouldSucceed: false,
    },
  ],
  "/translate": [
    {
      route: "/translate",
      description: "Translate - English to Spanish",
      body: { text: "Hello world", targetLang: "ES" },
      expectedResponse: { translatedText: expect.any(String) },
      shouldSucceed: true,
    },
    {
      route: "/translate",
      description: "Translate - Spanish to English",
      body: { text: "Hola mundo", targetLang: "EN" },
      expectedResponse: { translatedText: expect.any(String) },
      shouldSucceed: true,
    },
    {
      route: "/translate",
      description: "Translate - empty text should fail",
      body: { text: "", targetLang: "ES" },
      expectedResponse: { error: expect.any(String) },
      shouldSucceed: false,
    },
  ],
  "/encrypt": [
    {
      route: "/encrypt",
      description: "Encrypt - valid string",
      body: { dataToEncrypt: "test data" },
      expectedResponse: { dataEncrypted: expect.any(String) },
      shouldSucceed: true,
    },
    {
      route: "/encrypt",
      description: "Encrypt - should include success true",
      body: { dataToEncrypt: "another test" },
      expectedResponse: { success: true },
      shouldSucceed: true,
    },
    {
      route: "/encrypt",
      description: "Encrypt - empty string",
      body: { dataToEncrypt: "" },
      expectedResponse: {
        error: expect.any(String),
      },
      shouldSucceed: false,
    },
  ],
  "/decrypt": [
    {
      route: "/decrypt",
      description: "Decrypt - valid encrypted data",
      body: {
        dataToDecrypt: encrypt("test data"),
      },
      expectedResponse: { decryptedValue: expect.any(String) },
      shouldSucceed: true,
    },
    {
      route: "/decrypt",
      description: "Decrypt - should include success true",
      body: { dataToDecrypt: encrypt("another test") },
      expectedResponse: { success: true },
      shouldSucceed: true,
    },
    {
      route: "/decrypt",
      description: "Decrypt - invalid encrypted data should fail",
      body: { dataToDecrypt: "invalid-encrypted-data" },
      expectedResponse: { error: expect.any(String) },
      shouldSucceed: false,
    },
  ],
  "/doQueryDB": [
    {
      route: "/doQueryDB",
      description: "Execute query - SELECT query",
      body: { query: "SELECT 1 as test", showFields: true },
      expectedResponse: {
        result: expect.objectContaining({
          rows: expect.any(Array),
          rowCount: expect.any(Number),
        }),
      },
      shouldSucceed: true,
    },
    {
      route: "/doQueryDB",
      description: "Execute query - without showFields",
      body: { query: "SELECT NOW()", showFields: false },
      expectedResponse: { result: expect.anything() },
      shouldSucceed: true,
    },
    {
      route: "/doQueryDB",
      description: "Execute query - invalid SQL should fail",
      body: { query: "INVALID SQL SYNTAX", showFields: false },
      expectedResponse: { error: expect.any(String) },
      shouldSucceed: false,
    },
  ],
  "/auth/signup": [
    {
      route: "/auth/signup",
      description: "Signup - new user with valid data",
      body: {
        lang: "en",
        email: emailNew,
        password: passwordNew,
      },
      expectedResponse: { success: true },
      shouldSucceed: true,
    },
    {
      route: "/auth/signup",
      description: "Signup - duplicate email should fail",
      body: {
        lang: "en",
        email: emailNew,
        password: "Password123!",
      },
      expectedResponse: { success: false, error: expect.any(String) },
      shouldSucceed: false,
    },
    {
      route: "/auth/signup",
      description: "Signup - weak password should fail",
      body: {
        lang: "es",
        email: `another${Date.now()}@example.com`,
        password: "123",
      },
      expectedResponse: { success: false, error: expect.any(String) },
      shouldSucceed: false,
    },
  ],
  "/auth/login": [
    {
      route: "/auth/login",
      description: "Login - valid credentials",
      body: {
        lang: "en",
        email: emailNew,
        password: passwordNew,
        deviceId: deviceIdNew,
        rememberMe: true,
        notificationToken: "token-123",
      },
      expectedResponse: {
        success: true,
        user: expect.any(Object),
        token: expect.any(String),
        storageValues: expect.any(Object),
      },
      shouldSucceed: true,
      onSuccess: addDataUser,
    },
    {
      route: "/auth/login",
      description: "Login - invalid credentials should fail",
      body: {
        lang: "en",
        email: emailNew,
        password: "WrongPassword",
        deviceId: "device-002",
        rememberMe: false,
        notificationToken: "token-456",
      },
      expectedResponse: { success: false, error: expect.any(String) },
      shouldSucceed: false,
    },
    {
      route: "/auth/login",
      description: "Login - should return token on success",
      body: {
        lang: "es",
        email: emailNew,
        password: passwordNew,
        deviceId: deviceIdNew,
        rememberMe: true,
        notificationToken: "token-789",
      },
      expectedResponse: { token: expect.any(String) },
      shouldSucceed: true,
      onSuccess: addDataUser,
    },
  ],
  "/auth/refreshSession": [
    {
      route: "/auth/refreshSession",
      description: "Refresh session - valid token",
      body: { lang: "en", deviceId: deviceIdNew },
      expectedResponse: { success: true, token: expect.any(String) },
      shouldSucceed: true,
      authorization: getAuthToken,
      onSuccess: addDataUser,
    },
    {
      route: "/auth/refreshSession",
      description: "Refresh session - should return user data",
      body: { lang: "es", deviceId: deviceIdNew },
      expectedResponse: { user: expect.any(Object) },
      shouldSucceed: true,
      authorization: getAuthToken,
      onSuccess: addDataUser,
    },
    {
      route: "/auth/refreshSession",
      description: "Refresh session - expired token should fail",
      body: { lang: "en", deviceId: "device-003" },
      expectedResponse: { success: false, error: expect.any(String) },
      shouldSucceed: false,
      authorization: () => "expired-or-invalid-token",
    },
  ],
  "/database/fetch": [
    {
      route: "/database/fetch",
      description: "Fetch - get all users",
      body: {
        lang: "en",
        table: "Users",
        match: undefined,
        deviceId: deviceIdNew,
      },
      expectedResponse: { data: expect.any(Array) },
      shouldSucceed: true,
      authorization: getAuthToken,
    },
    {
      route: "/database/fetch",
      description: "Fetch - get specific user by email",
      body: () => ({
        lang: "en",
        table: "Users",
        match: { email: emailNew, userId: getUserId() },
        deviceId: deviceIdNew,
        pagination: false,
      }),
      expectedResponse: { data: expect.any(Array) },
      shouldSucceed: true,
      authorization: getAuthToken,
    },
    {
      route: "/database/fetch",
      description: "Fetch - with pagination",
      body: {
        lang: "es",
        table: "Logs",
        deviceId: deviceIdNew,
        pagination: true,
        limit: 10,
        offset: 0,
        orderBy: "userId",
        orderDirection: "DESC",
      },
      expectedResponse: { data: expect.any(Array) },
      shouldSucceed: true,
      authorization: getAuthToken,
    },
    {
      route: "/database/fetch",
      description: "Fetch - with search term",
      body: {
        lang: "es",
        table: "Logs",
        deviceId: deviceIdNew,
        search: "test",
        columnsToSearch: "message",
      },
      expectedResponse: { data: expect.any(Array) },
      shouldSucceed: true,
      authorization: getAuthToken,
    },
    {
      route: "/database/fetch",
      description: "Fetch - with search term and pagination",
      body: {
        lang: "es",
        table: "Logs",
        deviceId: deviceIdNew,
        pagination: true,
        limit: 10,
        orderBy: "userId",
        orderDirection: "DESC",
        search: "error",
        columnsToSearch: "message",
      },
      expectedResponse: { data: expect.any(Array) },
      shouldSucceed: true,
      authorization: getAuthToken,
    },
  ],
  "/database/insert": [
    {
      route: "/database/insert",
      description: "Insert - new crypto entry",
      body: () => ({
        lang: "en",
        table: "Cryptos",
        values: {
          id: "BTC",
          amount: "0.5",
          firstPricePurchased: 50000,
          datePurchased: new Date().toISOString(),
          currency: "USDT",
          userId: getUserId(),
        },
        deviceId: deviceIdNew,
      }),
      expectedResponse: { success: true, data: expect.any(Array) },
      shouldSucceed: true,
      authorization: getAuthToken,
      onSuccess: storeInsertedCryptoUid,
    },
    {
      route: "/database/insert",
      description: "Insert - multiple logs",
      body: () => ({
        lang: "es",
        table: "Logs",
        values: [
          {
            type: "log",
            userId: getUserId(),
            message: "First log",
            deviceId: deviceIdNew,
            timestamp: new Date().toISOString(),
            deviceName: "Device 1",
          },
          {
            type: "warn",
            userId: getUserId(),
            message: "Second log",
            deviceId: deviceIdNew,
            timestamp: new Date().toISOString(),
            deviceName: "Device 1",
          },
        ],
        deviceId: deviceIdNew,
      }),
      expectedResponse: { success: true },
      shouldSucceed: true,
      authorization: getAuthToken,
      onSuccess: storeInsertedLogId,
    },
    {
      route: "/database/insert",
      description: "Insert - duplicate entry should fail",
      body: {
        lang: "en",
        table: "Users",
        values: {},
        deviceId: deviceIdNew,
      },
      expectedResponse: { success: false, error: expect.any(String) },
      shouldSucceed: false,
      authorization: getAuthToken,
    },
  ],
  "/database/update": [
    {
      route: "/database/update",
      description: "Update - user email",
      body: {
        lang: "en",
        table: "Users",
        match: { email: emailNew },
        values: { email: `newemail${Date.now()}@example.com` },
        deviceId: deviceIdNew,
      },
      expectedResponse: { success: true, data: expect.any(Array) },
      shouldSucceed: true,
      authorization: getAuthToken,
    },
    {
      route: "/database/update",
      description: "Update - crypto amount",
      body: () => ({
        lang: "es",
        table: "Cryptos",
        match: { userId: getUserId(), id: "BTC", currency: "USDT" },
        values: { amount: "1.5" },
        deviceId: deviceIdNew,
      }),
      expectedResponse: { success: true },
      shouldSucceed: true,
      authorization: getAuthToken,
    },
    {
      route: "/database/update",
      description: "Update - non-existent record",
      body: {
        lang: "en",
        table: "Users",
        match: { userId: "00000000-0000-0000-0000-000000000000" },
        values: { description: "noop" },
        deviceId: deviceIdNew,
      },
      expectedResponse: { success: true },
      shouldSucceed: true,
      authorization: getAuthToken,
    },
  ],
  "/database/delete": [
    {
      route: "/database/delete",
      description: "Delete - specific log entry",
      body: () => ({
        lang: "en",
        table: "Logs",
        match: { id: getLogId(), userId: getUserId() },
        deviceId: deviceIdNew,
      }),
      expectedResponse: { success: true },
      shouldSucceed: true,
      authorization: getAuthToken,
    },
    {
      route: "/database/delete",
      description: "Delete - crypto by uid",
      body: () => ({
        lang: "es",
        table: "Cryptos",
        match: { uid: getCryptoUid(), userId: getUserId() },
        deviceId: deviceIdNew,
      }),
      expectedResponse: { success: true },
      shouldSucceed: true,
      authorization: getAuthToken,
    },
    {
      route: "/database/delete",
      description: "Delete - non-existent record should still succeed",
      body: {
        lang: "en",
        table: "Logs",
        match: { id: "00000000-0000-0000-0000-000000000000" },
        deviceId: deviceIdNew,
      },
      shouldSucceed: true,
      authorization: getAuthToken,
      expectedResponse: { success: true },
    },
  ],
  "/auth/signOut": [
    {
      route: "/auth/signOut",
      description: "Sign out - valid session",
      body: {
        lang: "en",
        deviceId: deviceIdNew,
      },
      expectedResponse: { success: true },
      shouldSucceed: true,
      authorization: getAuthToken,
    },
    {
      route: "/auth/signOut",
      description: "Sign out - invalid token should fail",
      body: {
        lang: "en",
        deviceId: deviceIdNew,
      },
      expectedResponse: { success: false },
      shouldSucceed: false,
      authorization: () => "invalid-token",
    },
  ],
  "/addStreamer": [
    {
      route: "/addStreamer",
      description: "Add streamer - Twitch streamer",
      body: () => ({
        name: "elmariana",
        userId: getUserId(),
      }),
      expectedResponse: { success: true, streamer: expect.any(Object) },
      shouldSucceed: true,
    },
    {
      route: "/addStreamer",
      description: "Add streamer - should check if live",
      body: () => ({
        name: "ninja",
        userId: getUserId(),
      }),
      expectedResponse: {
        streamer: expect.objectContaining({ isLive: expect.any(Boolean) }),
      },
      shouldSucceed: true,
    },
    {
      route: "/addStreamer",
      description: "Add streamer - invalid name should fail",
      body: {
        name: "",
        userId: "user-789",
      },
      expectedResponse: { error: expect.any(String) },
      shouldSucceed: false,
    },
  ],
  "/getIsLiveStreamer": [
    {
      route: "/getIsLiveStreamer",
      description: "Check streamer - active streamer",
      body: {
        streamer: {
          id: "streamer-123",
          name: "shroud",
          userId: "user-123",
          createdAt: new Date().toISOString(),
          linkImage: "https://example.com/image.jpg",
        },
      },
      expectedResponse: {
        streamer: expect.objectContaining({ isLive: expect.any(Boolean) }),
      },
      shouldSucceed: true,
    },
    {
      route: "/getIsLiveStreamer",
      description: "Check streamer - offline streamer",
      body: {
        streamer: {
          id: "streamer-456",
          name: "unknownstreamer",
          userId: "user-456",
          createdAt: new Date().toISOString(),
          linkImage: null,
        },
      },
      expectedResponse: {
        streamer: expect.objectContaining({ isLive: false }),
      },
      shouldSucceed: true,
    },
    {
      route: "/getIsLiveStreamer",
      description: "Check streamer - invalid data should fail",
      body: {
        streamer: {
          name: "",
          userId: "",
          createdAt: "",
          linkImage: null,
        },
      },
      expectedResponse: { error: expect.any(String) },
      shouldSucceed: false,
    },
  ],
  "/images/changeImageFormat": [
    {
      route: "/images/changeImageFormat",
      description: "Change format - PNG to JPEG",
      body: {
        lang: "en",
        format: "png",
        imageBufferInString: getBase64SamplePngImage(),
      },
      expectedResponse: {
        success: true,
        imageUri: expect.any(String),
      },
      shouldSucceed: true,
    },
    {
      route: "/images/changeImageFormat",
      description: "Change format - JPEG to WebP",
      body: {
        lang: "es",
        format: "webp",
        imageBufferInString: getBase64SamplePngImage(),
      },
      expectedResponse: { success: true },
      shouldSucceed: true,
    },
    {
      route: "/images/changeImageFormat",
      description: "Change format - invalid image data should fail",
      body: {
        lang: "en",
        format: "png",
        imageBufferInString: "invalid-image-data",
      },
      expectedResponse: { success: false, error: expect.any(String) },
      shouldSucceed: false,
    },
  ],
};
