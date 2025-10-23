import type {
  SelectedCryptos,
  KeyStorageValues,
  ExpectedStorageTypes,
} from "./../../app/utils/constants/keysStorage";
import {
  deleteInTable,
  updateInTable,
  fetchFromTable,
  insertIntoTable,
} from "../supabase/functions.ts";
import type {
  Tables,
  UserData,
  RequestAuth,
  ResponseAuth,
  Notifications,
  RequestSignOut,
  ResponseSignOut,
  ReasonNotification,
  RequestRefreshSession,
  ResponseRefreshSession,
} from "../../types";
import jwt from "jsonwebtoken";
import env from "../env.ts";
import chalk from "chalk";
import { t } from "../translations/index.ts";
import bcrypt from "bcryptjs";
import type { NextFunction, Request, Response } from "express";

declare global {
  namespace Express {
    interface Request {
      user: { tokenDecoded: TokenJWT; token: string };
    }
  }
}

type TokenJWT = {
  userId: string;
  email: string;
  deviceId: string;
  expoToken: string;
};

const expiresIn = "17d";

const getDateWithDaysAhead = (days: number): Date => {
  const date = new Date();
  date.setDate(date.getDate() + days);
  return date;
};

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

const getJWTToken = (storedValues: TokenJWT): string => {
  try {
    return jwt.sign(storedValues, env.JWT_SECRET, {
      expiresIn,
    });
  } catch (error) {
    console.error(chalk.red("Error generating JWT token:"), error);
    return "";
  }
};

export const decodeJWTToken = (token: string): TokenJWT | null => {
  try {
    const decoded = jwt.verify(token, env.JWT_SECRET) as TokenJWT;
    return decoded;
  } catch (error) {
    console.error(chalk.red("Error decoding JWT token:"), error);
    return null;
  }
};

export const getStorageData = async (
  userId: string,
  rememberMe: boolean,
  token: string,
): Promise<Record<KeyStorageValues, unknown> | null> => {
  if (!token) return null;
  if (!userId) return null;

  const [
    usersData,
    cryptosData,
    userConfigData,
    streamersUserData,
    userNotificationsConfigData,
  ] = await Promise.all([
    fetchFromTable("Users", { userId }),
    fetchFromTable("Cryptos", { userId }),
    fetchFromTable("UserConfig", { userId }),
    fetchFromTable("Streamers", { userId }),
    fetchFromTable("UserNotificationsConfig", { userId }),
  ]);

  let userData = usersData.data;
  let cryptos = cryptosData.data;
  let userConfig = userConfigData.data;
  let streamersUser = streamersUserData.data;
  const userNotificationsConfig = userNotificationsConfigData.data;

  if (Array.isArray(userData)) userData = userData[0];
  if (Array.isArray(userConfig)) userConfig = userConfig[0];
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
        acc.data[reason] = null;
        acc.intervals[reason] = config.interval;
        return acc;
      },
      { enabled: {}, data: {}, intervals: {}, paused: {} } as Notifications,
    );

  console.log(
    "User notifications config to save:",
    userNotificationsConfigToSave,
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
    _userSessionTokenStorage: token,
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
    _userData: user || null,
  };

  return storageData;
};

export const initializeTables = async (userId: string, lang: string) => {
  const updatedAt = new Date().toISOString();
  const [userConfig, userNotificationsConfig] = await Promise.all([
    insertIntoTable("UserConfig", {
      language: lang,
      userId,
      theme: "auto",
      hasAdmin: false,
      updatedAt,
    }),
    insertIntoTable("UserNotificationsConfig", [
      {
        reason: "allNotifications",
        enabled: false,
        interval: -1,
        userId,
        updatedAt,
        paused: false,
        pauseTime: -1,
      },
      {
        reason: "cryptos",
        enabled: false,
        interval: 600000,
        userId,
        updatedAt,
        paused: false,
        pauseTime: -1,
      },
      {
        reason: "batteryAlerts",
        enabled: true,
        interval: -1,
        userId,
        updatedAt,
        paused: false,
        pauseTime: -1,
      },
      {
        reason: "locationEnabled",
        enabled: false,
        interval: 600000,
        userId,
        updatedAt,
        paused: false,
        pauseTime: -1,
      },
      {
        reason: "noInternetConnection",
        enabled: true,
        interval: 600000,
        userId,
        updatedAt,
        paused: false,
        pauseTime: -1,
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
};

export const handleLogin = async (
  req: Request<unknown, unknown, RequestAuth>,
  res: Response<ResponseAuth>,
) => {
  const { email, password, deviceId, expoToken, rememberMe } = req.body || {};
  let { lang } = req.body;
  if (!lang) lang = "en";
  try {
    if (!email || !password) {
      res
        .status(400)
        .json({ success: false, error: t("auth.wrongCredentials", lang) });
      return;
    }
    if (!deviceId) {
      res
        .status(400)
        .json({ success: false, error: t("auth.deviceInfoIsRequired", lang) });
      return;
    }

    let { data: user } = await fetchFromTable("Users", { email });
    if (Array.isArray(user)) user = user[0];

    if (!user) {
      res
        .status(401)
        .json({ success: false, error: t("auth.userNotFound", lang) });
      return;
    }

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      res
        .status(401)
        .json({ success: false, error: t("auth.invalidPassword", lang) });
      return;
    }

    const token = getJWTToken({
      email: user.email,
      deviceId,
      userId: user.userId,
      expoToken: expoToken || "Web",
    });
    await Promise.all([
      deleteInTable(user.userId, "UserSessions", {
        deviceId,
        userId: user.userId,
      }),
      deleteInTable(user.userId, "PushTokens", { token: expoToken }),
    ]);

    const dataInsert = await insertIntoTable("UserSessions", {
      userId: user.userId,
      token,
      deviceId,
      updatedAt: new Date().toISOString(),
    });

    if (dataInsert.error || !dataInsert.data) {
      console.error(
        chalk.red("Error inserting user session:"),
        dataInsert.error,
      );
      res.status(500).json({ success: false, error: t("internalError", lang) });
      return;
    }

    const error = await insertTokenToDB(expoToken, user.userId);

    if (error) console.error(chalk.red("Error inserting push token:"), error);

    let userSession = dataInsert.data;
    if (Array.isArray(userSession)) userSession = userSession[0];
    const storageValues = await getStorageData(
      user.userId,
      !!rememberMe,
      token,
    );

    if (!storageValues) {
      console.error(chalk.red("Error fetching storage values for user"));
      res.status(500).json({ success: false, error: t("internalError", lang) });
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

    res.json({
      user: userData,
      token: userSession.token,
      success: !!userSession.token,
      storageValues,
    });
  } catch (error) {
    console.error(chalk.red("Error logging in user:"), error);
    res.status(500).json({ success: false, error: t("internalError", lang) });
    return;
  }
};

export const handleSignIn = async (
  req: Request<unknown, unknown, RequestAuth>,
  res: Response<ResponseAuth>,
) => {
  const { email, password } = req.body;
  let { lang } = req.body;
  if (!lang) lang = "en";

  if (!email || !password) {
    res.status(400).json({
      success: false,
      error: t("auth.emailAndPasswordRequired", lang),
    });
    return;
  }
  const passwordRegex = /(?=.*[A-Za-z])(?=.*\d)[A-Za-z\d]{8,}/;
  if (!passwordRegex.test(password)) {
    res
      .status(400)
      .json({ success: false, error: t("auth.passwordNotStrong", lang) });
    return;
  }

  try {
    const { data: userExists } = await fetchFromTable("Users", { email });

    if (!userExists || (Array.isArray(userExists) && userExists.length > 0)) {
      res
        .status(400)
        .json({ success: false, error: t("auth.accountAlreadyExists", lang) });
      return;
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const insertedData = await insertIntoTable("Users", {
      email: email,
      password: hashedPassword,
    });

    let user = insertedData.data;
    if (Array.isArray(user)) user = user[0];

    if (!user) {
      console.error(chalk.red("Error inserting user: No data returned"));
      res.status(500).json({ success: false, error: t("internalError", lang) });
      return;
    }

    if (!(await initializeTables(user.userId, lang))) {
      res.status(500).json({ success: false, error: t("internalError", lang) });
      return;
    }

    res.status(201).json({ success: !!user });
  } catch (error) {
    console.error(chalk.red("Error registering user:"), error);
    res.status(500).json({ success: false, error: t("internalError", lang) });
  }
};

export const handleRefreshSession = async (
  req: Request<unknown, unknown, RequestRefreshSession>,
  res: Response<ResponseRefreshSession>,
) => {
  let { lang } = req.body;
  if (!lang) lang = "en";
  const { deviceId, expoToken } = req.body || {};
  const { tokenDecoded: decoded, token } = req.user;

  try {
    if (!decoded) {
      res
        .status(401)
        .json({ success: false, error: t("auth.invalidCredentials", lang) });
      await Promise.all([
        deleteInTable("", "UserSessions", {
          deviceId,
          token,
        }),
        deleteInTable("", "PushTokens", {
          token: expoToken,
        }),
      ]);
      return;
    }

    const newToken = getJWTToken({
      email: decoded.email,
      deviceId: decoded.deviceId,
      userId: decoded.userId,
      expoToken: decoded.expoToken,
    });

    const updatedData = await updateInTable(
      "UserSessions",
      {
        token: newToken,
        updatedAt: new Date().toISOString(),
      },
      { token, userId: decoded.userId, deviceId: decoded.deviceId },
    );

    let update = updatedData.data;
    if (Array.isArray(update)) update = update[0];

    if (!update) {
      console.error(chalk.red("Error updating user session: No data returned"));
      res.status(500).json({ success: false, error: t("internalError", lang) });
      return;
    }
    const userData = await fetchFromTable("Users", { userId: decoded.userId });

    res.json({
      success: true,
      token: update.token,
      userData: (userData.data as UserData) || null,
    });
  } catch (error) {
    console.error(chalk.red("Error refreshing token:"), error);
    res.status(401).json({ success: false, error: "Invalid token" });
  }
};

export const handleSignOut = async (
  req: Request<unknown, unknown, RequestSignOut>,
  res: Response<ResponseSignOut>,
) => {
  const { tokenDecoded: decoded } = req.user;
  const { deviceId, expoToken } = req.body || {};
  let { lang } = req.body;
  if (!lang) lang = "en";

  try {
    if (!deviceId) {
      res.status(400).json({
        success: false,
        error: t("auth.deviceIdRequired", lang),
      });
      return;
    }

    if (!decoded) {
      res
        .status(401)
        .json({ success: false, error: t("auth.invalidCredentials", lang) });
      await Promise.all([
        deleteInTable("", "UserSessions", {
          deviceId,
        }),
        deleteInTable("", "PushTokens", { token: expoToken }),
      ]);
      return;
    }

    if (!decoded.userId || !decoded.deviceId) {
      res
        .status(401)
        .json({ success: false, error: t("auth.invalidCredentials", lang) });
      return;
    }

    if (decoded.deviceId !== deviceId) {
      res.status(401).json({
        success: false,
        error: t("auth.invalidCredentials", lang),
      });
      return;
    }

    deleteInTable(decoded.userId, "PushTokens", {
      userId: decoded.userId,
      token: decoded.expoToken,
    });

    const deletedData = await deleteInTable(decoded.userId, "UserSessions", {
      userId: decoded.userId,
      deviceId: decoded.deviceId,
    });

    const deleted = deletedData.success;
    if (!deleted) {
      console.error(chalk.red("Error deleting user session"));
      res.status(500).json({ success: false, error: t("internalError", lang) });
      return;
    }

    res.json({ success: true });
  } catch (error) {
    console.error(chalk.red("Error signing out user:"), error);
    res.status(500).json({ success: false, error: t("internalError", lang) });
  }
};

export const authMiddleware = (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  const authHeader = req.headers["authorization"];
  if (!authHeader)
    return res.status(401).json({ error: "Authorization header missing" });

  const [scheme, token] = authHeader.split(" ");
  if (scheme !== "Bearer" || !token)
    return res.status(401).json({ error: "Invalid authorization format" });

  try {
    const payload = decodeJWTToken(token);
    if (!payload) {
      res.status(401).json({ error: "Invalid or expired token" });
      return;
    }

    req.user = { tokenDecoded: payload, token };
    next();
  } catch (err) {
    console.error(chalk.red("Error in auth middleware:"), err);
    res.status(401).json({ error: "Invalid or expired token" });
  }
};
