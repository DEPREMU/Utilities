import {
  t,
  Logger,
  Helper,
  Validations,
  getHandlerPost,
  STATUS_RESPONSE,
} from "@common";
import chalk from "chalk";
import bcrypt from "@node-rs/bcrypt";
import { prisma } from "@/database/postgres.ts";
import { JWT, DATA_REASONS, getStorageData } from "../variables.ts";

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

export const handleLogin = getHandlerPost(
  "/auth",
  "/login",
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
        return sendResponse(STATUS_RESPONSE.UNAUTHORIZED, {
          success: false,
          error: t("auth.userNotFound", lang),
        });

      const isMatch = await bcrypt.compare(password, user.password);
      if (!isMatch)
        return sendResponse(STATUS_RESPONSE.UNAUTHORIZED, {
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
        sendResponse(STATUS_RESPONSE.INTERNAL_SERVER_ERROR, {
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
        sendResponse(STATUS_RESPONSE.INTERNAL_SERVER_ERROR, {
          success: false,
          error: t("internalError", lang),
        });
        return;
      }
      const { password: _, ...userData } = user;

      sendResponse(STATUS_RESPONSE.SUCCESS, {
        user: Helper.Object.changeType(userData, {
          createdAt: "string",
          updatedAt: "string",
        }),
        token: userSession.token,
        success: true,
        storageValues,
      });
    } catch (error) {
      Logger.error(chalk.red("Error logging in user:"), error);
      sendResponse(STATUS_RESPONSE.INTERNAL_SERVER_ERROR, {
        success: false,
        error: t("internalError", lang),
      });
    }
  },
);

export const handleSignIn = getHandlerPost(
  "/auth",
  "/signup",
  {
    email: "string",
    password: "string",
  },
  async (body, sendResponse) => {
    const lang = body.lang || "en";

    try {
      const { email, password } = body;

      if (!Validations.isValidPassword(password))
        return sendResponse(STATUS_RESPONSE.BAD_REQUEST, {
          success: false,
          error: t("auth.passwordNotStrong", lang),
        });
      if (!Validations.isValidEmail(email))
        return sendResponse(STATUS_RESPONSE.BAD_REQUEST, {
          success: false,
          error: t("auth.invalidEmailFormat", lang),
        });

      const userExists = await prisma.users.findUnique({
        where: { email },
        select: { email: true },
      });

      if (userExists)
        return sendResponse(STATUS_RESPONSE.BAD_REQUEST, {
          success: false,
          error: t("auth.accountAlreadyExists", lang),
        });

      const hashedPassword = await bcrypt.hash(password, 10);

      const user = await prisma.users.create({
        data: {
          email,
          password: hashedPassword,
          userConfig: { create: { theme: "auto" } },
          notificationsConfigs: { createMany: { data: DATA_REASONS } },
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
        sendResponse(STATUS_RESPONSE.INTERNAL_SERVER_ERROR, {
          success: false,
          error: t("internalError", lang),
        });
        return;
      }

      sendResponse(STATUS_RESPONSE.SUCCESS, { success: true });
    } catch (error) {
      Logger.error(chalk.red("Error in sign-in handler:"), error);
      sendResponse(STATUS_RESPONSE.INTERNAL_SERVER_ERROR, {
        success: false,
        error: t("internalError", lang),
      });
    }
  },
);

export const handleRefreshSession = getHandlerPost(
  "/auth",
  "/refreshSession",
  { deviceId: "string", notificationToken: "string" },
  async (body, sendResponse, { req }) => {
    const lang = body.lang || "en";

    try {
      const { token } = req.user || {};
      const { notificationToken } = body;

      const newToken = token.newToken;
      if (!newToken) {
        Logger.error(
          chalk.red("Error refreshing token: No new token generated"),
        );
        sendResponse(STATUS_RESPONSE.INTERNAL_SERVER_ERROR, {
          success: false,
          error: t("internalError", lang),
        });
        return;
      }

      if (Validations.isValidPushToken(notificationToken))
        await prisma.pushTokens.upsert({
          update: { token: notificationToken },
          create: {
            token: notificationToken,
            userId: token.data.userId,
          },
          where: {
            token_userId: {
              token: token.data.notificationToken,
              userId: token.data.userId,
            },
          },
        });

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
        sendResponse(STATUS_RESPONSE.INTERNAL_SERVER_ERROR, {
          success: false,
          error: t("internalError", lang),
        });
        return;
      }

      if (!updatedData.user) {
        Logger.error(chalk.red("Error fetching user data for refreshed token"));
        sendResponse(STATUS_RESPONSE.INTERNAL_SERVER_ERROR, {
          success: false,
          error: t("internalError", lang),
        });
        return;
      }

      const { password: _, ...user } = updatedData.user;

      sendResponse(STATUS_RESPONSE.SUCCESS, {
        user: Helper.Object.changeType(user, {
          createdAt: "string",
          updatedAt: "string",
        }),
        token: updatedData.token,
        success: true,
      });
    } catch (error) {
      Logger.error(chalk.red("Error refreshing token:"), error);
      sendResponse(STATUS_RESPONSE.INTERNAL_SERVER_ERROR, {
        success: false,
        error: t("internalError", lang),
      });
    }
  },
);

export const handleSignOut = getHandlerPost(
  "/auth",
  "/signout",
  {},
  async (body, sendResponse, { req }) => {
    const lang = body.lang || "en";

    try {
      const { token } = req.user;
      const data = token?.data;

      await Promise.all([
        prisma.userSessions.delete({
          where: {
            userId_deviceId: {
              userId: data.userId,
              deviceId: data.deviceId,
            },
          },
        }),
        Validations.isValidPushToken(data.notificationToken)
          ? prisma.pushTokens.delete({
              where: {
                token_userId: {
                  token: data.notificationToken,
                  userId: data.userId,
                },
              },
            })
          : Promise.resolve(),
      ]);

      sendResponse(STATUS_RESPONSE.SUCCESS, { success: true });
    } catch (error) {
      Logger.error(chalk.red("Error signing out user:"), error);
      sendResponse(STATUS_RESPONSE.INTERNAL_SERVER_ERROR, {
        success: false,
        error: t("internalError", lang),
      });
    }
  },
);
