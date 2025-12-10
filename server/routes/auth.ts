import {
  getJWTToken,
  decodeJWTToken,
  getDateWithDaysAhead,
  getJWTTokenAndUpload,
} from "functions/auth.ts";
import {
  deleteInTable,
  updateInTable,
  fetchFromTable,
  insertIntoTable,
} from "../database/functions.ts";
import {
  Tables,
  UserData,
  RequestAuth,
  ResponseAuth,
  Notifications,
  RequestSignOut,
  ResponseSignOut,
  SelectedCryptos,
  ReasonNotification,
  LanguagesSupported,
  ExpectedStorageTypes,
  RequestRefreshSession,
  ResponseRefreshSession,
} from "@types";
import chalk from "chalk";
import { t } from "../translations/index.ts";
import bcrypt from "bcryptjs";
import { sendResponse } from "./../variables.ts";
import { NextFunction, Request, Response } from "express";

/**
 * Inserts a push token into the database for a specific user.
 *
 * @param token - The push token to store, can be undefined
 * @param userId - The unique identifier of the user
 * @returns A promise that resolves to an object containing an error property.
 *          If successful, error will be null. If an error occurs, error will contain the error message.
 *
 * @example
 * ```typescript
 * const result = await insertTokenToDB("push_token_123", "user_456");
 * if (result.error) {
 *   console.error("Failed to insert token:", result.error);
 * }
 * ```
 */
const insertTokenToDB = async (
  token: string | undefined,
  userId: string,
): Promise<string | null> => {
  try {
    if (!token || token === "Web") return null;
    await insertIntoTable("PushTokens", {
      token,
      userId,
    });
    return null;
  } catch (error) {
    console.error(chalk.red("Error getting push token:"), error);
    return error instanceof Error ? error.message : String(error);
  }
};

export const getStorageData = async (
  userId: string,
  rememberMe: boolean,
  token: string,
): Promise<ExpectedStorageTypes<"BOTH"> | null> => {
  if (!token) return null;
  if (!userId) return null;

  try {
    const [
      usersData,
      cryptosData,
      userConfigData,
      streamersUserData,
      userNotificationsConfigData,
    ] = await Promise.all([
      fetchFromTable({ table: "Users", match: { userId } }),
      fetchFromTable({ table: "Cryptos", match: { userId } }),
      fetchFromTable({ table: "UserConfig", match: { userId } }),
      fetchFromTable({ table: "Streamers", match: { userId } }),
      fetchFromTable({ table: "UserNotificationsConfig", match: { userId } }),
    ]);

    const userData = usersData.data?.[0];
    let cryptos = cryptosData.data;
    const userConfig = userConfigData.data?.[0];
    let streamersUser = streamersUserData.data;
    const userNotificationsConfig = userNotificationsConfigData.data;

    if (!Array.isArray(streamersUser)) {
      if (!streamersUser) streamersUser = [];
      else streamersUser = [streamersUser];
    }
    if (!Array.isArray(cryptos)) {
      if (!cryptos) cryptos = [];
      else cryptos = [cryptos];
    }
    if (!Array.isArray(userNotificationsConfig)) return null;
    if (!userData) return null;

    const user: Partial<UserData> = { ...userData };

    delete user["password"];

    const streamers: Notifications["enabled"]["streamers"] = Object.fromEntries(
      userNotificationsConfig
        ?.filter((config) => config.reason === "streamers" && !!config.streamer)
        .map((config) => [
          config.streamer,
          {
            name: config.streamer,
            enabled: config.enabled,
          },
        ]) || [],
    );

    const cryptosToSave: SelectedCryptos =
      cryptos?.reduce((acc, crypto) => {
        acc[crypto.id + crypto.currency] = crypto;
        return acc;
      }, {} as SelectedCryptos) || {};

    const userNotificationsConfigToSave: Notifications =
      userNotificationsConfig.reduce(
        (acc, config) => {
          const reason = config.reason as ReasonNotification;
          if (reason === "streamers") acc.enabled[reason] = streamers;
          else {
            acc.enabled[reason] = config.enabled;
            acc.paused[reason] = {
              isPaused: config.paused,
              timePaused: config.pauseTime,
            };
          }
          acc.intervals[reason] = config.interval;
          return acc;
        },
        { enabled: {}, intervals: {}, paused: {} } as Notifications,
      );

    const userConfigToSave: Tables["UserConfig"] = {
      userId,
      language: userConfig?.language || "en",
      hasAdmin: userConfig?.hasAdmin || false,
      updatedAt: new Date().toISOString(),
      theme: userConfig?.theme || "auto",
      webSocketURL: userConfig?.webSocketURL || "",
      API_URL: userConfig?.API_URL || "",
    };
    let date = -1;
    if (rememberMe) date = getDateWithDaysAhead(15).getTime();

    const storageData: ExpectedStorageTypes<"BOTH"> = {
      _sessionExpiry: date,
      _selectedCryptos: cryptosToSave,
      _lastUpdateCheck: Date.now(),
      _downDetectorData: [],
      _userSessionTokenStorage: token,
      _terminalCommands: null,
      "@API_URL": userConfigToSave.API_URL || "",
      "@hasAdminAccess": userConfigToSave.hasAdmin,
      "@notifications": userNotificationsConfigToSave,
      "@languageKeyStorage": userConfigToSave.language,
      "@webSocketURL": userConfigToSave.webSocketURL || "",
      "@clipboardWebSocketURL":
        userConfigToSave.webSocketURL?.replace("/ws", "/clipboard") || "",
      "@theme": userConfigToSave.theme || "auto",
      "@pendingTasks": null,
      _Streamers: streamersUser
        ?.map((streamer) => ({ ...streamer, isLive: false }))
        .filter(Boolean),
      _deviceId: "",
      _userData: (user as Omit<UserData, "password">) || null,
    };

    return storageData;
  } catch (error) {
    console.error(chalk.red("Error fetching storage data:"), error);
    return null;
  }
};

export const initializeTables = async (
  userId: string,
  language: LanguagesSupported,
) => {
  try {
    const updatedAt = new Date().toISOString();

    const commonValues = {
      userId,
      updatedAt,
    };

    const commonValuesNotifications = {
      ...commonValues,
      paused: false,
      enabled: false,
      interval: -1,
      pauseTime: -1,
    };

    const [userConfig, userNotificationsConfig] = await Promise.all([
      insertIntoTable("UserConfig", {
        language,
        theme: "auto",
        hasAdmin: false,
        ...commonValues,
      }),
      insertIntoTable("UserNotificationsConfig", [
        {
          ...commonValuesNotifications,
          reason: "allNotifications",
        },
        {
          ...commonValuesNotifications,
          reason: "cryptos",
          interval: 600000,
        },
        {
          ...commonValuesNotifications,
          reason: "batteryAlerts",
        },
        {
          ...commonValuesNotifications,
          reason: "locationEnabled",
        },
        {
          ...commonValuesNotifications,
          reason: "noInternetConnection",
        },
      ]),
    ]);

    const userConfigError = userConfig.error;
    const userNotificationsConfigError = userNotificationsConfig.error;
    if (userConfigError || userNotificationsConfigError) {
      console.error(
        chalk.red("Error initializing user tables:"),
        userConfigError || userNotificationsConfigError,
      );
      return false;
    }
    return true;
  } catch (error) {
    console.error(chalk.red("Error initializing user tables:"), error);
    return false;
  }
};

export const handleLogin = async (
  req: Request<unknown, unknown, RequestAuth<"login">>,
  res: Response<ResponseAuth>,
) => {
  const { email, password, deviceId, notificationToken, rememberMe } =
    req.body || {};
  let { lang } = req.body || { lang: "en" };
  if (!lang) lang = "en";

  try {
    if (!email || !password)
      return sendResponse(
        res,
        "BAD_REQUEST",
        { success: false, error: t("auth.emailAndPasswordRequired", lang) },
        "/auth/login",
      );

    if (!deviceId)
      return sendResponse(
        res,
        "BAD_REQUEST",
        { success: false, error: t("auth.deviceInfoIsRequired", lang) },
        "/auth/login",
      );

    const user = (await fetchFromTable({ table: "Users", match: { email } }))
      .data?.[0];

    if (!user)
      return sendResponse(
        res,
        "UNAUTHORIZED",
        { success: false, error: t("auth.userNotFound", lang) },
        "/auth/login",
      );

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch)
      return sendResponse(
        res,
        "UNAUTHORIZED",
        { success: false, error: t("auth.invalidPassword", lang) },
        "/auth/login",
      );

    const dataInsert = await getJWTTokenAndUpload({
      deviceId,
      email: user.email,
      userId: user.userId,
      notificationToken,
    });

    if (dataInsert.error || !dataInsert.data) {
      console.error(
        chalk.red("Error inserting user session:"),
        dataInsert.error,
      );
      sendResponse(
        res,
        "INTERNAL_SERVER_ERROR",
        { success: false, error: t("internalError", lang) },
        "/auth/login",
      );
      return;
    }

    const error = await insertTokenToDB(notificationToken, user.userId);

    if (error) console.error(chalk.red("Error inserting push token:"), error);

    const userSession = dataInsert.data?.[0];

    const storageValues = await getStorageData(
      user.userId,
      !!rememberMe,
      dataInsert.data[0].token,
    );

    if (!storageValues) {
      console.error(chalk.red("Error fetching storage values for user"));
      sendResponse(
        res,
        "INTERNAL_SERVER_ERROR",
        { success: false, error: t("internalError", lang) },
        "/auth/login",
      );
      return;
    }
    const userData: Omit<UserData, "password"> = Object.entries(user).reduce(
      (acc, [key, value]) => {
        if (key !== "password")
          acc[key as keyof Omit<UserData, "password">] = value as never;

        return acc;
      },
      {} as Omit<UserData, "password">,
    );

    sendResponse(
      res,
      "SUCCESS",
      {
        user: userData,
        token: userSession.token,
        success: true,
        storageValues,
      },
      "/auth/login",
    );
  } catch (error) {
    console.error(chalk.red("Error logging in user:"), error);
    sendResponse(
      res,
      "INTERNAL_SERVER_ERROR",
      { success: false, error: t("internalError", lang) },
      "/auth/login",
    );
  }
};

export const handleSignIn = async (
  req: Request<unknown, unknown, RequestAuth<"signup">>,
  res: Response<ResponseAuth>,
) => {
  let { lang } = req.body || { lang: "en" };
  if (!lang) lang = "en";
  const { email, password } = req.body || {};

  try {
    if (!email || !password)
      return sendResponse(
        res,
        "BAD_REQUEST",
        { success: false, error: t("auth.emailAndPasswordRequired", lang) },
        "/auth/signup",
      );

    const passwordRegex = /(?=.*[A-Za-z])(?=.*\d)[A-Za-z\d]{8,}/;
    if (!passwordRegex.test(password))
      return sendResponse(
        res,
        "BAD_REQUEST",
        { success: false, error: t("auth.passwordNotStrong", lang) },
        "/auth/signup",
      );

    const { data: userExists } = await fetchFromTable({
      table: "Users",
      match: { email },
    });

    if (
      userExists ||
      (Array.isArray(userExists) && (userExists as []).length > 0)
    )
      return sendResponse(
        res,
        "BAD_REQUEST",
        { success: false, error: t("auth.accountAlreadyExists", lang) },
        "/auth/signup",
      );

    const hashedPassword = await bcrypt.hash(password, 10);

    const insertedData = await insertIntoTable("Users", {
      email: email,
      password: hashedPassword,
    });

    const user = insertedData.data?.[0];

    if (!user) {
      console.error(chalk.red("Error inserting user: No data returned"));
      sendResponse(
        res,
        "INTERNAL_SERVER_ERROR",
        { success: false, error: t("internalError", lang) },
        "/auth/signup",
      );
      return;
    }

    if (!(await initializeTables(user.userId, lang)))
      return sendResponse(
        res,
        "INTERNAL_SERVER_ERROR",
        { success: false, error: t("internalError", lang) },
        "/auth/signup",
      );

    sendResponse(res, "SUCCESS", { success: !!user }, "/auth/signup");
  } catch (error) {
    console.error(chalk.red("Error in sign-in handler:"), error);
    sendResponse(
      res,
      "INTERNAL_SERVER_ERROR",
      { success: false, error: t("internalError", lang) },
      "/auth/signup",
    );
  }
};

export const handleRefreshSession = async (
  req: Request<unknown, unknown, RequestRefreshSession>,
  res: Response<ResponseRefreshSession>,
) => {
  let { lang } = req.body || { lang: "en" };
  if (!lang) lang = "en";

  try {
    const { tokenDecoded: decoded, token } = req.user || {};

    const newToken = getJWTToken({
      email: decoded.email,
      deviceId: decoded.deviceId,
      userId: decoded.userId,
      notificationToken: decoded.notificationToken,
    });

    const updatedData = await updateInTable(
      "UserSessions",
      {
        token: newToken,
        updatedAt: new Date().toISOString(),
      },
      { token, userId: decoded.userId, deviceId: decoded.deviceId },
    );

    if (updatedData.error || !updatedData.data) {
      console.error(
        chalk.red("Error updating user session:"),
        updatedData.error,
      );
      sendResponse(
        res,
        "INTERNAL_SERVER_ERROR",
        { success: false, error: t("internalError", lang) },
        "/auth/refreshSession",
      );
      return;
    }

    const update = updatedData.data[0];

    if (!update) {
      console.error(chalk.red("Error updating user session: No data returned"));
      sendResponse(
        res,
        "INTERNAL_SERVER_ERROR",
        { success: false, error: t("internalError", lang) },
        "/auth/refreshSession",
      );
      return;
    }

    const userDataFetch = (
      await fetchFromTable({
        table: "Users",
        match: { userId: decoded.userId },
      })
    ).data;

    if (!userDataFetch || userDataFetch.length === 0) {
      console.error(chalk.red("Error fetching user data for refreshed token"));
      sendResponse(
        res,
        "INTERNAL_SERVER_ERROR",
        { success: false, error: t("internalError", lang) },
        "/auth/refreshSession",
      );
      return;
    }

    const userData: Partial<UserData> = userDataFetch[0];
    delete userData["password"];

    sendResponse(
      res,
      "SUCCESS",
      {
        success: true,
        token: update.token,
        userData: userData as Omit<UserData, "password">,
      },
      "/auth/refreshSession",
    );
  } catch (error) {
    console.error(chalk.red("Error refreshing token:"), error);
    sendResponse(
      res,
      "INTERNAL_SERVER_ERROR",
      { success: false, error: t("internalError", lang) },
      "/auth/refreshSession",
    );
  }
};

export const handleSignOut = async (
  req: Request<unknown, unknown, RequestSignOut>,
  res: Response<ResponseSignOut>,
) => {
  const { tokenDecoded: decoded } = req.user || {};
  const { deviceId } = req.body || {};
  let { lang } = req.body || { lang: "en" };
  if (!lang) lang = "en";

  try {
    if (!deviceId)
      return sendResponse(
        res,
        "BAD_REQUEST",
        { success: false, error: t("auth.deviceIdRequired", lang) },
        "/auth/signOut",
      );

    deleteInTable(decoded.userId, "PushTokens", {
      userId: decoded.userId,
      token: decoded.notificationToken,
    });

    const deletedData = await deleteInTable(decoded.userId, "UserSessions", {
      userId: decoded.userId,
      deviceId: decoded.deviceId,
    });

    const deleted = deletedData.success;
    if (!deleted) {
      console.error(chalk.red("Error deleting user session"));
      sendResponse(
        res,
        "INTERNAL_SERVER_ERROR",
        { success: false, error: t("internalError", lang) },
        "/auth/signOut",
      );
      return;
    }

    sendResponse(res, "SUCCESS", { success: true }, "/auth/signOut");
  } catch (error) {
    console.error(chalk.red("Error signing out user:"), error);
    sendResponse(
      res,
      "INTERNAL_SERVER_ERROR",
      { success: false, error: t("internalError", lang) },
      "/auth/signOut",
    );
  }
};

export const authMiddleware = (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    const authHeader = req.headers?.["authorization"];
    if (!authHeader)
      return sendResponse(
        res,
        "UNAUTHORIZED",
        {
          error: "Authorization header missing",
          success: false,
        },
        "/auth/login",
      );

    const [scheme, token] = authHeader.split(" ");
    if (scheme !== "Bearer" || !token)
      return sendResponse(
        res,
        "UNAUTHORIZED",
        {
          error: "Invalid authorization format",
          success: false,
        },
        "/auth/login",
      );

    const { deviceId } = (req.body as { deviceId: string | null }) || {};
    if (!deviceId)
      return sendResponse(
        res,
        "BAD_REQUEST",
        {
          error: "Device ID is required",
          success: false,
        },
        "/auth/login",
      );

    const payload = decodeJWTToken(token);
    if (!payload)
      return sendResponse(
        res,
        "UNAUTHORIZED",
        {
          error: "Invalid or expired token",
          success: false,
        },
        "/auth/login",
      );

    if (payload.deviceId !== deviceId)
      return sendResponse(
        res,
        "FORBIDDEN",
        { error: "Forbidden request", success: false },
        "/auth/login",
      );

    req.user = { tokenDecoded: payload, token };
    next();
  } catch (err) {
    console.error(chalk.red("Error in auth middleware:"), err);
    sendResponse(
      res,
      "UNAUTHORIZED",
      { error: "Invalid or expired token", success: false },
      "/auth/login",
    );
  }
};
