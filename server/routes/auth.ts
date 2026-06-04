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
  t,
  Logger,
  sendResponse,
  isValidEmail,
  isValidPassword,
  reasonNotification,
  ExpectedStorageTypes,
} from "@common";
import chalk from "chalk";
import bcrypt from "bcryptjs";
import { getHandlerPost } from "../functions/getHandlerPost.ts";
import { NextFunction, Request, Response } from "express";
import {
  Tables,
  UserData,
  LanguagesSupported,
  UserNotificationsConfig,
} from "@types";

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
 *   Logger.error("Failed to insert token:", result.error);
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
    Logger.error(chalk.red("Error getting push token:"), error);
    return error instanceof Error ? error.message : String(error);
  }
};

export const getStorageData = async (
  userId: string,
  rememberMe: boolean,
  token: string,
): Promise<Partial<ExpectedStorageTypes<"BOTH">> | null> => {
  if (!token) return null;
  if (!userId) return null;

  try {
    const [
      usersData,
      userConfigData,
      streamersUserData,
      userNotificationsConfigData,
    ] = await Promise.all([
      fetchFromTable({ table: "Users", match: { userId } }),
      fetchFromTable({ table: "UserConfig", match: { userId } }),
      fetchFromTable({ table: "Streamers", match: { userId } }),
      fetchFromTable({ table: "UserNotificationsConfig", match: { userId } }),
    ]);

    const userData = usersData.data?.[0];
    const userConfig = userConfigData.data?.[0];
    const streamersUser = streamersUserData.data;
    const userNotificationsConfig = userNotificationsConfigData.data;

    if (!Array.isArray(userNotificationsConfig)) return null;
    if (!userData) return null;

    const user: Partial<UserData> = { ...userData };

    delete user["password"];

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

    const storageData: Partial<ExpectedStorageTypes<"BOTH">> = {
      SESSION_EXPIRY: date,
      LAST_UPDATE_CHECK: Date.now(),
      USER_SESSION_TOKEN_STORAGE: token,
      HAS_ADMIN_ACCESS: userConfigToSave.hasAdmin,
      LANGUAGE: userConfigToSave.language,
      THEME: userConfigToSave.theme || "auto",
      STREAMERS:
        streamersUser
          ?.map((streamer) => ({ ...streamer, isLive: false }))
          .filter(Boolean) || null,
      USER_DATA: (user as Omit<UserData, "password">) || null,
      ...(userConfigToSave.hasAdmin
        ? {
            API_URL: userConfigToSave.API_URL || "",
            WEBSOCKET_URL: userConfigToSave.webSocketURL || "",
            CLIPBOARD_WEBSOCKET_URL:
              userConfigToSave.webSocketURL?.replace("/ws", "/clipboard") || "",
          }
        : {}),
    };

    return storageData;
  } catch (error) {
    Logger.error(chalk.red("Error fetching storage data:"), error);
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

    const commonValuesNotifications: Omit<UserNotificationsConfig, "reason"> = {
      ...commonValues,
      paused: false,
      enabled: false,
      pauseTime: -1,
    };

    const [userConfig, userNotificationsConfig] = await Promise.all([
      insertIntoTable("UserConfig", {
        language,
        theme: "auto",
        hasAdmin: false,
        ...commonValues,
      }),
      insertIntoTable(
        "UserNotificationsConfig",
        reasonNotification.map((reason) => ({
          ...commonValuesNotifications,
          reason,
        })),
      ),
    ]);

    const userConfigError = userConfig.error;
    const userNotificationsConfigError = userNotificationsConfig.error;
    if (userConfigError || userNotificationsConfigError) {
      Logger.error(
        chalk.red("Error initializing user tables:"),
        userConfigError || userNotificationsConfigError,
      );
      return false;
    }
    return true;
  } catch (error) {
    Logger.error(chalk.red("Error initializing user tables:"), error);
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

      const res = await fetchFromTable({
        table: "Users",
        match: { email },
      });

      const user = res.data?.[0];

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
        Logger.error(
          chalk.red("Error inserting user session:"),
          dataInsert.error,
        );
        sendResponse("INTERNAL_SERVER_ERROR", {
          success: false,
          error: t("internalError", lang),
        });
        return;
      }

      const error = await insertTokenToDB(notificationToken, user.userId);

      if (error) Logger.error(chalk.red("Error inserting push token:"), error);

      const userSession = dataInsert.data?.[0];

      const storageValues = await getStorageData(
        user.userId,
        !!rememberMe,
        dataInsert.data[0].token,
      );

      if (!storageValues) {
        Logger.error(chalk.red("Error fetching storage values for user"));
        sendResponse("INTERNAL_SERVER_ERROR", {
          success: false,
          error: t("internalError", lang),
        });
        return;
      }
      const userData: Omit<UserData, "password"> = { ...user };
      delete (userData as Partial<UserData>).password;

      sendResponse("SUCCESS", {
        user: userData,
        token: userSession.token,
        success: true,
        storageValues,
      });
    } catch (error) {
      Logger.error(chalk.red("Error logging in user:"), error);
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
        Logger.error(chalk.red("Error inserting user: No data returned"));
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
      Logger.error(chalk.red("Error in sign-in handler:"), error);
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
        Logger.error(
          chalk.red("Error updating user session:"),
          updatedData.error,
        );
        sendResponse("INTERNAL_SERVER_ERROR", {
          success: false,
          error: t("internalError", lang),
        });
        return;
      }

      const update = updatedData.data[0];

      if (!update) {
        Logger.error(
          chalk.red("Error updating user session: No data returned"),
        );
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
        Logger.error(chalk.red("Error fetching user data for refreshed token"));
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
      Logger.error(chalk.red("Error refreshing token:"), error);
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
        Logger.error(chalk.red("Error deleting user session"));
        sendResponse("INTERNAL_SERVER_ERROR", {
          success: false,
          error: t("internalError", lang),
        });
        return;
      }

      sendResponse("SUCCESS", { success: true });
    } catch (error) {
      Logger.error(chalk.red("Error signing out user:"), error);
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
    Logger.error(chalk.red("Error in auth middleware:"), err);
    sendResponse(
      res,
      "UNAUTHORIZED",
      { error: "Invalid or expired token", success: false },
      "/auth/login",
    );
  }
};
