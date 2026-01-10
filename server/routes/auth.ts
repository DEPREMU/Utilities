import {
  getJWTToken,
  decodeJWTToken,
  getDateWithDaysAhead,
  getJWTTokenAndUpload,
} from "../functions/auth.ts";
import {
  deleteInTable,
  updateInTable,
  fetchFromTable,
  insertIntoTable,
} from "../database/functions.ts";
import {
  Tables,
  UserData,
  Notifications,
  ReasonNotification,
  LanguagesSupported,
} from "@types";
import {
  t,
  sendResponse,
  isValidEmail,
  isValidPassword,
  SelectedCryptos,
  ExpectedStorageTypes,
} from "@common";
import chalk from "chalk";
import bcrypt from "bcryptjs";
import { showError } from "../functions/logger.ts";
import { getHandlerPost } from "../functions/getHandlerPost.ts";
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
 *   showError("Failed to insert token:", result.error);
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
    showError(chalk.red("Error getting push token:"), error);
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
      SESSION_EXPIRY: date,
      SELECTED_CRYPTOS: cryptosToSave,
      LAST_UPDATE_CHECK: Date.now(),
      DOWN_DETECTOR_DATA: [],
      USER_SESSION_TOKEN_STORAGE: token,
      TERMINAL_COMMANDS: null,
      VAULT_MASTER_KEY_WRAPPED: null,
      VAULT_AUTH_VERIFIER: null,
      VAULT_SETTINGS: null,
      VAULT_INDEX: null,
      API_URL: userConfigToSave.API_URL || "",
      HAS_ADMIN_ACCESS: userConfigToSave.hasAdmin,
      NOTIFICATIONS: userNotificationsConfigToSave,
      LANGUAGE: userConfigToSave.language,
      WEBSOCKET_URL: userConfigToSave.webSocketURL || "",
      CLIPBOARD_WEBSOCKET_URL:
        userConfigToSave.webSocketURL?.replace("/ws", "/clipboard") || "",
      THEME: userConfigToSave.theme || "auto",
      PENDING_TASKS: null,
      STREAMERS: streamersUser
        ?.map((streamer) => ({ ...streamer, isLive: false }))
        .filter(Boolean),
      DEVICE_ID: "",
      USER_DATA: (user as Omit<UserData, "password">) || null,
      RECORDER_DATA: null,
    };

    return storageData;
  } catch (error) {
    showError(chalk.red("Error fetching storage data:"), error);
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
      showError(
        chalk.red("Error initializing user tables:"),
        userConfigError || userNotificationsConfigError,
      );
      return false;
    }
    return true;
  } catch (error) {
    showError(chalk.red("Error initializing user tables:"), error);
    return false;
  }
};

export const handleLogin = getHandlerPost(
  "/auth/login",
  {
    email: "string",
    password: "string",
    deviceId: "string",
    rememberMe: "boolean",
    notificationToken: "string",
  },
  async (body, sendResponse) => {
    const lang = body.lang || "en";

    try {
      const { email, password, deviceId, notificationToken, rememberMe } = body;

      const user = (await fetchFromTable({ table: "Users", match: { email } }))
        .data?.[0];

      if (!user)
        return sendResponse("UNAUTHORIZED", {
          success: false,
          error: t("auth.userNotFound", lang),
        });

      const isMatch = await bcrypt.compare(password, user.password);
      if (!isMatch)
        return sendResponse("UNAUTHORIZED", {
          success: false,
          error: t("auth.invalidPassword", lang),
        });

      const dataInsert = await getJWTTokenAndUpload({
        deviceId,
        email: user.email,
        userId: user.userId,
        notificationToken,
      });

      if (dataInsert.error || !dataInsert.data) {
        showError(chalk.red("Error inserting user session:"), dataInsert.error);
        sendResponse("INTERNAL_SERVER_ERROR", {
          success: false,
          error: t("internalError", lang),
        });
        return;
      }

      const error = await insertTokenToDB(notificationToken, user.userId);

      if (error) showError(chalk.red("Error inserting push token:"), error);

      const userSession = dataInsert.data?.[0];

      const storageValues = await getStorageData(
        user.userId,
        !!rememberMe,
        dataInsert.data[0].token,
      );

      if (!storageValues) {
        showError(chalk.red("Error fetching storage values for user"));
        sendResponse("INTERNAL_SERVER_ERROR", {
          success: false,
          error: t("internalError", lang),
        });
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

      sendResponse("SUCCESS", {
        user: userData,
        token: userSession.token,
        success: true,
        storageValues,
      });
    } catch (error) {
      showError(chalk.red("Error logging in user:"), error);
      sendResponse("INTERNAL_SERVER_ERROR", {
        success: false,
        error: t("internalError", lang),
      });
    }
  },
);

export const handleSignIn = getHandlerPost(
  "/auth/signup",
  {
    email: "string",
    password: "string",
  },
  async (body, sendResponse) => {
    const lang = body.lang || "en";

    try {
      const { email, password } = body;

      if (!isValidPassword(password))
        return sendResponse("BAD_REQUEST", {
          success: false,
          error: t("auth.passwordNotStrong", lang),
        });
      if (!isValidEmail(email))
        return sendResponse("BAD_REQUEST", {
          success: false,
          error: t("auth.invalidEmailFormat", lang),
        });

      const { data: userExists } = await fetchFromTable({
        table: "Users",
        match: { email },
      });

      if (
        userExists ||
        (Array.isArray(userExists) && (userExists as []).length > 0)
      )
        return sendResponse("BAD_REQUEST", {
          success: false,
          error: t("auth.accountAlreadyExists", lang),
        });

      const hashedPassword = await bcrypt.hash(password, 10);

      const insertedData = await insertIntoTable("Users", {
        email: email,
        password: hashedPassword,
      });

      const user = insertedData.data?.[0];

      if (!user) {
        showError(chalk.red("Error inserting user: No data returned"));
        sendResponse("INTERNAL_SERVER_ERROR", {
          success: false,
          error: t("internalError", lang),
        });
        return;
      }

      if (!(await initializeTables(user.userId, lang)))
        return sendResponse("INTERNAL_SERVER_ERROR", {
          success: false,
          error: t("internalError", lang),
        });

      sendResponse("SUCCESS", { success: !!user });
    } catch (error) {
      showError(chalk.red("Error in sign-in handler:"), error);
      sendResponse("INTERNAL_SERVER_ERROR", {
        success: false,
        error: t("internalError", lang),
      });
    }
  },
);

export const handleRefreshSession = getHandlerPost(
  "/auth/refreshSession",
  {},
  async (body, sendResponse, req) => {
    const lang = body.lang || "en";

    try {
      const { tokenDecoded: decoded, token } = req.user || {};

      const newToken = await getJWTToken({
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
        showError(chalk.red("Error updating user session:"), updatedData.error);
        sendResponse("INTERNAL_SERVER_ERROR", {
          success: false,
          error: t("internalError", lang),
        });
        return;
      }

      const update = updatedData.data[0];

      if (!update) {
        showError(chalk.red("Error updating user session: No data returned"));
        sendResponse("INTERNAL_SERVER_ERROR", {
          success: false,
          error: t("internalError", lang),
        });
        return;
      }

      const userDataFetch = (
        await fetchFromTable({
          table: "Users",
          match: { userId: decoded.userId },
        })
      ).data;

      if (!userDataFetch || userDataFetch.length === 0) {
        showError(chalk.red("Error fetching user data for refreshed token"));
        sendResponse("INTERNAL_SERVER_ERROR", {
          success: false,
          error: t("internalError", lang),
        });
        return;
      }

      const userData: Partial<UserData> = userDataFetch[0];
      delete userData["password"];

      sendResponse("SUCCESS", {
        user: userData as Omit<UserData, "password">,
        token: update.token,
        success: true,
      });
    } catch (error) {
      showError(chalk.red("Error refreshing token:"), error);
      sendResponse("INTERNAL_SERVER_ERROR", {
        success: false,
        error: t("internalError", lang),
      });
    }
  },
);

export const handleSignOut = getHandlerPost(
  "/auth/signOut",
  {},
  async (body, sendResponse, req) => {
    const { tokenDecoded: decoded } = req.user || {};
    const lang = body.lang || "en";

    try {
      deleteInTable(decoded.userId, "PushTokens", {
        userId: decoded.userId,
        token: decoded.notificationToken,
      });

      const deletedData = await deleteInTable(decoded.userId, "UserSessions", {
        userId: decoded.userId,
        deviceId: decoded.deviceId,
      });

      if (!deletedData.success) {
        showError(chalk.red("Error deleting user session"));
        sendResponse("INTERNAL_SERVER_ERROR", {
          success: false,
          error: t("internalError", lang),
        });
        return;
      }

      sendResponse("SUCCESS", { success: true });
    } catch (error) {
      showError(chalk.red("Error signing out user:"), error);
      sendResponse("INTERNAL_SERVER_ERROR", {
        success: false,
        error: t("internalError", lang),
      });
    }
  },
);

export const authMiddleware = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    const authHeader = req.headers?.authorization;
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

    const deviceId = req.body?.deviceId as string | undefined;
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

    const payload = await decodeJWTToken(token);
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
    showError(chalk.red("Error in auth middleware:"), err);
    sendResponse(
      res,
      "UNAUTHORIZED",
      { error: "Invalid or expired token", success: false },
      "/auth/login",
    );
  }
};
