import {
  t,
  Logger,
  sendResponse,
  isValidEmail,
  isValidPassword,
  reasonNotification,
  getDateWithTimeAhead,
  ExpectedStorageTypes,
} from "@common";
import chalk from "chalk";
import bcrypt from "bcryptjs";
import { JWT } from "@/functions/auth.ts";
import { prisma } from "@/database/postgres.ts";
import { getHandlerPost } from "@/functions/getHandlerPost.ts";
import { NextFunction, Request, Response } from "express";

const data = reasonNotification.map((reason) => ({ reason }));

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
 * const error = await insertTokenToDB("push_token_123", "user_456");
 * if (error) {
 *   Logger.error("Failed to insert token:", error);
 * }
 * ```
 */
const insertTokenToDB = async (
  token: string | undefined,
  userId: string,
): Promise<Error | null> => {
  try {
    if (!token || token === "Web") return null;

    await prisma.pushTokens.upsert({
      where: {
        token_userId: { token, userId },
      },
      update: { userId },
      create: { token, userId },
    });
    return null;
  } catch (error) {
    Logger.error(chalk.red("Error getting push token:"), error);
    return error instanceof Error ? error : new Error(String(error));
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
    const USER = await prisma.users.findUnique({
      where: { userId },
      include: {
        streamers: true,
        userConfig: true,
        cryptosSettings: {
          include: { autoRefresh: true, notifications: true },
        },
      },
    });

    if (!USER || !USER.userConfig) return null;

    const {
      userConfig,
      streamers,
      password: _,
      cryptosSettings,
      ...user
    } = USER;

    let date = -1;
    if (rememberMe) date = getDateWithTimeAhead({ days: 15 }).getTime();

    let storageData: Partial<ExpectedStorageTypes<"BOTH">> = {
      THEME: userConfig.theme,
      LANGUAGE: userConfig.language,
      USER_DATA: user,
      SESSION_EXPIRY: date,
      HAS_ADMIN_ACCESS: userConfig.hasAdmin,
      CRYPTOS_SETTINGS: cryptosSettings,
      LAST_UPDATE_CHECK: Date.now(),
      USER_SESSION_TOKEN_STORAGE: token,
      STREAMERS:
        streamers
          .map((streamer) => ({ ...streamer, isLive: false }))
          .filter(Boolean) || undefined,
    };

    if (userConfig.hasAdmin) {
      storageData = {
        ...storageData,
        API_URL: userConfig.API_URL || undefined,
        WEBSOCKET_URL: userConfig.webSocketURL || undefined,
        CLIPBOARD_WEBSOCKET_URL:
          userConfig.webSocketURL?.replace("/ws", "/clipboard") || undefined,
      };
    }

    return storageData;
  } catch (error) {
    Logger.error(chalk.red("Error fetching storage data:"), error);
    return null;
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

      const user = await prisma.users.findUnique({
        where: { email },
      });

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

      const token = new JWT({
        content: {
          deviceId,
          notificationToken,
          email: user.email,
          userId: user.userId,
        },
      });
      const userSession = await token.uploadToken();

      if (userSession instanceof Error) {
        Logger.error(chalk.red("Error inserting user session:"), userSession);
        sendResponse("INTERNAL_SERVER_ERROR", {
          success: false,
          error: t("internalError", lang),
        });
        return;
      }

      const error = await insertTokenToDB(notificationToken, user.userId);

      if (error) Logger.error(chalk.red("Error inserting push token:"), error);

      const storageValues = await getStorageData(
        user.userId,
        !!rememberMe,
        userSession.token,
      );

      if (!storageValues) {
        Logger.error(chalk.red("Error fetching storage values for user"));
        sendResponse("INTERNAL_SERVER_ERROR", {
          success: false,
          error: t("internalError", lang),
        });
        return;
      }
      const { password: _, ...userData } = user;

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

      const [hashedPassword, userExists] = await Promise.all([
        bcrypt.hash(password, 10),
        prisma.users.findUnique({
          where: { email },
          select: { email: true },
        }),
      ]);

      if (userExists)
        return sendResponse("BAD_REQUEST", {
          success: false,
          error: t("auth.accountAlreadyExists", lang),
        });

      const user = await prisma.users.create({
        data: {
          email,
          password: hashedPassword,
          userConfig: { create: { theme: "auto" } },
          notificationsConfigs: { createMany: { data } },
          cryptosSettings: {
            create: {
              autoRefresh: { create: {} },
              notifications: { create: {} },
            },
          },
        },
      });

      if (!user) {
        Logger.error(
          chalk.red("Error inserting user: No data returned"),
          typeof user,
        );
        sendResponse("INTERNAL_SERVER_ERROR", {
          success: false,
          error: t("internalError", lang),
        });
        return;
      }

      sendResponse("SUCCESS", { success: true });
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
      const { token } = req.user || {};

      const newToken = token.updatedToken;
      if (!newToken) {
        Logger.error(
          chalk.red("Error refreshing token: No new token generated"),
        );
        sendResponse("INTERNAL_SERVER_ERROR", {
          success: false,
          error: t("internalError", lang),
        });
        return;
      }

      const updatedData = await prisma.userSessions.update({
        data: { token: newToken },
        where: {
          userId_deviceId: {
            userId: token.data.userId,
            deviceId: token.data.deviceId,
          },
        },
        include: { user: true },
      });

      if (updatedData?.token !== newToken) {
        Logger.error(
          chalk.red("Error updating user session: No data returned"),
        );
        sendResponse("INTERNAL_SERVER_ERROR", {
          success: false,
          error: t("internalError", lang),
        });
        return;
      }

      const user = updatedData.user;

      if (!user) {
        Logger.error(chalk.red("Error fetching user data for refreshed token"));
        sendResponse("INTERNAL_SERVER_ERROR", {
          success: false,
          error: t("internalError", lang),
        });
        return;
      }

      const { password: _, ...userData } = user;

      sendResponse("SUCCESS", {
        user: userData as Omit<typeof user, "password">,
        token: updatedData.token,
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
    const lang = body.lang || "en";

    try {
      const { token } = req.user;
      const data = token?.data;

      await Promise.all([
        prisma.pushTokens.delete({
          where: {
            token_userId: {
              token: token.token,
              userId: data.userId,
            },
          },
        }),
        prisma.userSessions.delete({
          where: {
            userId_deviceId: {
              userId: data.userId,
              deviceId: data.deviceId,
            },
          },
        }),
      ]);

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
  const response: Parameters<typeof sendResponse<"/auth/login">>[2] = {
    success: false,
  };

  try {
    const authHeader = req.headers?.authorization;
    if (!authHeader) {
      response.error = "Authorization header missing";
      return;
    }

    const [scheme, token] = authHeader.split(" ");
    if (scheme !== "Bearer" || !token) {
      response.error = "Invalid authorization format";
      return;
    }

    const deviceId = req.body?.deviceId as string | undefined;
    if (!deviceId) {
      response.error = "Device ID is required";
      return;
    }

    let tokenInstance: JWT;

    try {
      tokenInstance = new JWT({ token });

      if (tokenInstance.data.deviceId !== deviceId) {
        response.error = "Forbidden request";
        return;
      }
    } catch (error) {
      Logger.error(chalk.red("Error verifying JWT token:"), error);
      response.error = "Invalid or expired token";
      return;
    }

    req.user = { token: tokenInstance };
    response.success = true;
    next();
  } catch (err) {
    Logger.error(chalk.red("Error in auth middleware:"), err);
    response.error = "Unknown error occurred during authentication";
  } finally {
    if (response.error || !response.success)
      sendResponse(
        res,
        response.error ? "UNAUTHORIZED" : "SUCCESS",
        response,
        "/auth/login",
      );
  }
};
