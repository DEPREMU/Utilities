import {
  hashAuthCode,
  normalizeEmail,
  verifyAuthCode,
  generateAuthCode,
} from "@/utils/authCode.ts";
import {
  JWT,
  DATA_REASONS,
  getStorageData,
  AUTH_CODE_EXPIRATION,
  AUTH_CODE_MAX_ATTEMPTS,
} from "../variables.ts";
import {
  t,
  Logger,
  Helper,
  Validations,
  getHandlerPost,
  STATUS_RESPONSE,
} from "@common";
import chalk from "chalk";
import crypto from "node:crypto";
import bcrypt from "@node-rs/bcrypt";
import { prisma } from "@/database/postgres.ts";
import { RequestError } from "@commonSrc/both/errors/Error.ts";
import { getRedisClient } from "@/redis/client.ts";
import { withTransaction } from "@/database/transaction.ts";
import { enqueueAuthEmail } from "@/queue/authEmailQueue.ts";
import { getApproximateLocation } from "@/utils/geolocation.ts";

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
  async ({ body }, sendResponse) => {
    const lang = body.lang || "en";

    const { email, password, deviceId, notificationToken, rememberMe } = body;

    const user = await prisma.users.findUnique({
      where: { email },
    });

    if (!user)
      throw new RequestError(
        STATUS_RESPONSE.UNAUTHORIZED,
        t("auth.userNotFound", lang),
      );

    if (!user.password)
      throw new RequestError(
        STATUS_RESPONSE.UNAUTHORIZED,
        t("auth.invalidPassword", lang),
      );

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch)
      throw new RequestError(
        STATUS_RESPONSE.UNAUTHORIZED,
        t("auth.invalidPassword", lang),
      );

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
      throw new RequestError(
        STATUS_RESPONSE.INTERNAL_SERVER_ERROR,
        t("internalError", lang),
      );
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
      throw new RequestError(
        STATUS_RESPONSE.INTERNAL_SERVER_ERROR,
        t("internalError", lang),
      );
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
  },
);

export const handleSignIn = getHandlerPost(
  "/auth",
  "/signup",
  async ({ body }, sendResponse) => {
    const lang = body.lang || "en";

    const { email, password } = body;

    if (!Validations.isValidPassword(password))
      throw new RequestError(
        STATUS_RESPONSE.BAD_REQUEST,
        t("auth.passwordNotStrong", lang),
      );
    if (!Validations.isValidEmail(email))
      throw new RequestError(
        STATUS_RESPONSE.BAD_REQUEST,
        t("auth.invalidEmailFormat", lang),
      );

    const userExists = await prisma.users.findUnique({
      where: { email },
      select: { email: true },
    });

    if (userExists)
      throw new RequestError(
        STATUS_RESPONSE.BAD_REQUEST,
        t("auth.accountAlreadyExists", lang),
      );

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
      throw new RequestError(
        STATUS_RESPONSE.INTERNAL_SERVER_ERROR,
        t("internalError", lang),
      );
    }

    sendResponse(STATUS_RESPONSE.SUCCESS, { success: true });
  },
);

export const handleRefreshSession = getHandlerPost(
  "/auth",
  "/refreshSession",
  async ({ body }, sendResponse, { req }) => {
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

      const updatedData = await withTransaction(async (tx) => {
        if (Validations.isValidPushToken(notificationToken))
          await tx.pushTokens.upsert({
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

        return tx.userSessions.update({
          data: { token: newToken },
          where: {
            userId_deviceId: {
              userId: token.data.userId,
              deviceId: token.data.deviceId,
            },
          },
          include: { user: true },
        });
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
  async ({ body }, sendResponse, { req }) => {
    const lang = body.lang || "en";

    try {
      const { token } = req.user;
      const data = token?.data;

      await withTransaction(async (tx) => {
        await Promise.all([
          tx.userSessions.delete({
            where: {
              userId_deviceId: {
                userId: data.userId,
                deviceId: data.deviceId,
              },
            },
          }),
          Validations.isValidPushToken(data.notificationToken)
            ? tx.pushTokens.delete({
                where: {
                  token_userId: {
                    token: data.notificationToken,
                    userId: data.userId,
                  },
                },
              })
            : Promise.resolve(),
        ]);
      });

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

export const handleRequestCode = getHandlerPost(
  "/auth",
  "/request-code",
  async ({ body }, sendResponse, { req }) => {
    const lang = body.lang || "en";
    const rawEmail = body.email;

    if (!rawEmail) {
      throw new RequestError(
        STATUS_RESPONSE.BAD_REQUEST,
        t("auth.invalidEmailFormat", lang),
      );
    }

    const email = normalizeEmail(rawEmail);
    const redis = getRedisClient();

    const cooldownKey = `auth:cooldown:${email}`;
    const isCoolingDown = await redis.get(cooldownKey);
    if (isCoolingDown) {
      throw new RequestError(
        STATUS_RESPONSE.TOO_MANY_REQUESTS,
        t("auth.cooldownActive", lang),
      );
    }

    const clientIp = (req.ip || req.socket.remoteAddress || "unknown").replace(
      /^::ffff:/,
      "",
    );

    const emailRateKey = `auth:ratelimit:email:${email}`;
    const emailRequests = await redis.incr(emailRateKey);
    if (emailRequests === 1) {
      await redis.expire(emailRateKey, 600);
    }
    if (emailRequests > 5) {
      throw new RequestError(
        STATUS_RESPONSE.TOO_MANY_REQUESTS,
        t("auth.rateLimitExceeded", lang),
      );
    }

    const ipRateKey = `auth:ratelimit:ip:${clientIp}`;
    const ipRequests = await redis.incr(ipRateKey);
    if (ipRequests === 1) {
      await redis.expire(ipRateKey, 600);
    }
    if (ipRequests > 20) {
      throw new RequestError(
        STATUS_RESPONSE.TOO_MANY_REQUESTS,
        t("auth.rateLimitExceeded", lang),
      );
    }

    const user = await prisma.users.findUnique({
      where: { email },
      select: { userId: true },
    });
    const flowType = user ? "login" : "signin";

    const code = generateAuthCode(8);
    const codeHash = hashAuthCode(code);

    const challengePayload = JSON.stringify({
      codeHash,
      attempts: 0,
      maxAttempts: AUTH_CODE_MAX_ATTEMPTS,
      createdAt: Date.now(),
      expiresAt: Date.now() + AUTH_CODE_EXPIRATION * 1000,
      flowType,
      ip: clientIp,
    });

    await redis.set(
      `auth:challenge:${email}`,
      challengePayload,
      "EX",
      AUTH_CODE_EXPIRATION,
    );

    await redis.set(cooldownKey, "1", "EX", 60);

    const approximateLocation = await getApproximateLocation(clientIp);

    await enqueueAuthEmail({
      to: email,
      code,
      flowType,
      approximateLocation,
      expirationMinutes: Math.round(AUTH_CODE_EXPIRATION / 60),
      lang,
    });

    sendResponse(STATUS_RESPONSE.SUCCESS, { success: true });
  },
);

export const handleVerifyCode = getHandlerPost(
  "/auth",
  "/verify-code",
  async ({ body }, sendResponse) => {
    const lang = body.lang || "en";
    const {
      email: rawEmail,
      code,
      deviceId,
      notificationToken,
      rememberMe,
    } = body;

    if (!rawEmail || !Validations.isValidEmail(rawEmail)) {
      throw new RequestError(
        STATUS_RESPONSE.BAD_REQUEST,
        t("auth.invalidEmailFormat", lang),
      );
    }

    if (!code || typeof code !== "string" || code.trim().length !== 8) {
      throw new RequestError(
        STATUS_RESPONSE.BAD_REQUEST,
        t("auth.codeRequired", lang),
      );
    }

    if (!deviceId) {
      throw new RequestError(
        STATUS_RESPONSE.BAD_REQUEST,
        t("auth.deviceIdRequired", lang),
      );
    }

    const email = normalizeEmail(rawEmail);
    const redis = getRedisClient();
    const challengeKey = `auth:challenge:${email}`;

    const rawChallenge = await redis.get(challengeKey);
    if (!rawChallenge) {
      throw new RequestError(
        STATUS_RESPONSE.BAD_REQUEST,
        t("auth.codeExpired", lang),
      );
    }

    const challenge = JSON.parse(rawChallenge) as {
      codeHash: string;
      attempts: number;
      maxAttempts: number;
      flowType: "login" | "signin";
    };

    if (challenge.attempts >= challenge.maxAttempts) {
      await redis.del(challengeKey);
      throw new RequestError(
        STATUS_RESPONSE.TOO_MANY_REQUESTS,
        t("auth.tooManyAttempts", lang),
      );
    }

    const isMatch = verifyAuthCode(code, challenge.codeHash);
    if (!isMatch) {
      challenge.attempts += 1;

      if (challenge.attempts >= challenge.maxAttempts) {
        await redis.del(challengeKey);
        throw new RequestError(
          STATUS_RESPONSE.TOO_MANY_REQUESTS,
          t("auth.tooManyAttempts", lang),
        );
      }

      const remainingTtl = await redis.ttl(challengeKey);
      if (remainingTtl > 0) {
        await redis.set(
          challengeKey,
          JSON.stringify(challenge),
          "EX",
          remainingTtl,
        );
      }

      throw new RequestError(
        STATUS_RESPONSE.UNAUTHORIZED,
        t("auth.invalidCode", lang),
      );
    }

    await redis.del(challengeKey);

    let user = await prisma.users.findUnique({
      where: { email },
    });

    if (!user) {
      user = await prisma.users.create({
        data: {
          email,
          password: null,
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
        Logger.error(chalk.red("Error creating passwordless user"));
        throw new RequestError(
          STATUS_RESPONSE.INTERNAL_SERVER_ERROR,
          t("internalError", lang),
        );
      }
    }

    const token = new JWT({
      content: {
        deviceId,
        notificationToken: notificationToken || "",
        email: user.email,
        userId: user.userId,
      },
    });

    const userSession = await token.uploadToken();
    if (userSession instanceof Error) {
      Logger.error(chalk.red("Error inserting user session:"), userSession);
      throw new RequestError(
        STATUS_RESPONSE.INTERNAL_SERVER_ERROR,
        t("internalError", lang),
      );
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
      throw new RequestError(
        STATUS_RESPONSE.INTERNAL_SERVER_ERROR,
        t("internalError", lang),
      );
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
  },
);

export const handleForgotPasswordRequest = getHandlerPost(
  "/auth",
  "/forgot-password/request",
  async ({ body }, sendResponse, { req }) => {
    const lang = body.lang || "en";
    const rawEmail = body.email;

    if (!rawEmail || !Validations.isValidEmail(rawEmail)) {
      throw new RequestError(
        STATUS_RESPONSE.BAD_REQUEST,
        t("auth.invalidEmailFormat", lang),
      );
    }

    const email = normalizeEmail(rawEmail);
    const redis = getRedisClient();

    const cooldownKey = `auth:cooldown:reset:${email}`;
    const isCoolingDown = await redis.get(cooldownKey);
    if (isCoolingDown) {
      throw new RequestError(
        STATUS_RESPONSE.TOO_MANY_REQUESTS,
        t("auth.cooldownActive", lang),
      );
    }

    const clientIp = (req.ip || req.socket.remoteAddress || "unknown").replace(
      /^::ffff:/,
      "",
    );

    const emailRateKey = `auth:ratelimit:reset:email:${email}`;
    const emailRequests = await redis.incr(emailRateKey);
    if (emailRequests === 1) {
      await redis.expire(emailRateKey, 600);
    }
    if (emailRequests > 5) {
      throw new RequestError(
        STATUS_RESPONSE.TOO_MANY_REQUESTS,
        t("auth.rateLimitExceeded", lang),
      );
    }

    const ipRateKey = `auth:ratelimit:reset:ip:${clientIp}`;
    const ipRequests = await redis.incr(ipRateKey);
    if (ipRequests === 1) {
      await redis.expire(ipRateKey, 600);
    }
    if (ipRequests > 20) {
      throw new RequestError(
        STATUS_RESPONSE.TOO_MANY_REQUESTS,
        t("auth.rateLimitExceeded", lang),
      );
    }

    const user = await prisma.users.findUnique({
      where: { email },
      select: { userId: true },
    });

    if (!user) {
      await redis.set(cooldownKey, "1", "EX", 60);
      sendResponse(STATUS_RESPONSE.SUCCESS, { success: true });
      return;
    }

    const code = generateAuthCode(8);
    const codeHash = hashAuthCode(code);

    const challengePayload = JSON.stringify({
      codeHash,
      attempts: 0,
      maxAttempts: AUTH_CODE_MAX_ATTEMPTS,
      createdAt: Date.now(),
      expiresAt: Date.now() + AUTH_CODE_EXPIRATION * 1000,
      flowType: "resetPassword",
      ip: clientIp,
    });

    await redis.set(
      `auth:challenge:reset:${email}`,
      challengePayload,
      "EX",
      AUTH_CODE_EXPIRATION,
    );

    await redis.set(cooldownKey, "1", "EX", 60);

    const approximateLocation = await getApproximateLocation(clientIp);

    await enqueueAuthEmail({
      to: email,
      code,
      flowType: "resetPassword",
      approximateLocation,
      expirationMinutes: Math.round(AUTH_CODE_EXPIRATION / 60),
      lang,
    });

    sendResponse(STATUS_RESPONSE.SUCCESS, { success: true });
  },
);

export const handleForgotPasswordVerify = getHandlerPost(
  "/auth",
  "/forgot-password/verify",
  async ({ body }, sendResponse) => {
    const lang = body.lang || "en";
    const { email: rawEmail, code } = body;

    if (!rawEmail || !Validations.isValidEmail(rawEmail)) {
      throw new RequestError(
        STATUS_RESPONSE.BAD_REQUEST,
        t("auth.invalidEmailFormat", lang),
      );
    }

    if (!code || typeof code !== "string" || code.trim().length !== 8) {
      throw new RequestError(
        STATUS_RESPONSE.BAD_REQUEST,
        t("auth.invalidCode", lang),
      );
    }

    const email = normalizeEmail(rawEmail);
    const redis = getRedisClient();
    const challengeKey = `auth:challenge:reset:${email}`;

    const rawChallenge = await redis.get(challengeKey);
    if (!rawChallenge) {
      throw new RequestError(
        STATUS_RESPONSE.BAD_REQUEST,
        t("auth.invalidCode", lang),
      );
    }

    const challenge = JSON.parse(rawChallenge) as {
      codeHash: string;
      attempts: number;
      maxAttempts: number;
      flowType: string;
    };

    if (challenge.attempts >= challenge.maxAttempts) {
      await redis.del(challengeKey);
      throw new RequestError(
        STATUS_RESPONSE.TOO_MANY_REQUESTS,
        t("auth.tooManyAttempts", lang),
      );
    }

    const isMatch = verifyAuthCode(code, challenge.codeHash);
    if (!isMatch) {
      challenge.attempts += 1;

      if (challenge.attempts >= challenge.maxAttempts) {
        await redis.del(challengeKey);
        throw new RequestError(
          STATUS_RESPONSE.TOO_MANY_REQUESTS,
          t("auth.tooManyAttempts", lang),
        );
      }

      const remainingTtl = await redis.ttl(challengeKey);
      if (remainingTtl > 0) {
        await redis.set(
          challengeKey,
          JSON.stringify(challenge),
          "EX",
          remainingTtl,
        );
      }

      throw new RequestError(
        STATUS_RESPONSE.UNAUTHORIZED,
        t("auth.invalidCode", lang),
      );
    }

    await redis.del(challengeKey);

    const user = await prisma.users.findUnique({
      where: { email },
      select: { userId: true },
    });

    if (!user) {
      throw new RequestError(
        STATUS_RESPONSE.BAD_REQUEST,
        t("auth.invalidCode", lang),
      );
    }

    const resetToken = `rst_${crypto.randomBytes(24).toString("hex")}`;
    const tokenPayload = JSON.stringify({
      email,
      userId: user.userId,
      verifiedAt: Date.now(),
    });

    await redis.set(`auth:reset-token:${resetToken}`, tokenPayload, "EX", 600);

    sendResponse(STATUS_RESPONSE.SUCCESS, {
      success: true,
      resetToken,
    });
  },
);

export const handleForgotPasswordReset = getHandlerPost(
  "/auth",
  "/forgot-password/reset",
  async ({ body }, sendResponse) => {
    const lang = body.lang || "en";
    const { email: rawEmail, resetToken, newPassword } = body;

    if (!rawEmail || !Validations.isValidEmail(rawEmail)) {
      throw new RequestError(
        STATUS_RESPONSE.BAD_REQUEST,
        t("auth.invalidEmailFormat", lang),
      );
    }

    if (!resetToken || typeof resetToken !== "string") {
      throw new RequestError(
        STATUS_RESPONSE.BAD_REQUEST,
        t("auth.resetSessionExpired", lang),
      );
    }

    if (!newPassword || !Validations.isValidPassword(newPassword)) {
      throw new RequestError(
        STATUS_RESPONSE.BAD_REQUEST,
        t("auth.passwordRequirements", lang),
      );
    }

    const email = normalizeEmail(rawEmail);
    const redis = getRedisClient();
    const tokenKey = `auth:reset-token:${resetToken}`;

    const rawTokenData = await redis.get(tokenKey);
    if (!rawTokenData) {
      throw new RequestError(
        STATUS_RESPONSE.BAD_REQUEST,
        t("auth.resetSessionExpired", lang),
      );
    }

    const tokenData = JSON.parse(rawTokenData) as {
      email: string;
      userId: string;
    };

    if (tokenData.email !== email) {
      throw new RequestError(
        STATUS_RESPONSE.BAD_REQUEST,
        t("auth.resetSessionExpired", lang),
      );
    }

    const hashedPassword = await bcrypt.hash(newPassword);

    await withTransaction(async (tx) => {
      await tx.users.update({
        where: { userId: tokenData.userId },
        data: {
          password: hashedPassword,
        },
      });

      await tx.userSessions.deleteMany({
        where: { userId: tokenData.userId },
      });
    });

    await redis.del(tokenKey);
    await redis.del(`auth:challenge:reset:${email}`);

    sendResponse(STATUS_RESPONSE.SUCCESS, { success: true });
  },
);
