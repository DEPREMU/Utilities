import {
  Logger,
  Validations,
  reasonNotification,
  ExpectedStorageTypes,
  getDateWithTimeAhead,
} from "@common";
import jwt from "jsonwebtoken";
import { z } from "zod";
import chalk from "chalk";
import { prisma } from "@/database";
import { getEnvValue } from "@/env";
import type { ZodShape } from "@commonSrc/serverOrElectron/express/middlewares/schemas";
import { CryptoInterval } from "@/generated/prisma";
import { CryptosSettings } from "@types";
import { NonNullableDeep } from "type-fest";
import { withTransaction } from "@/database/transaction";

const SCHEMAS = {
  USER_DATA: z.object({
    name: z.string().nullable(),
    email: z.string(),
    phone: z.string().nullable(),
    userId: z.string(),
    createdAt: z.coerce.string(),
    updatedAt: z.coerce.string(),
    description: z.string().nullable(),
  } satisfies ZodShape<
    NonNullable<ExpectedStorageTypes<"SECURE">["USER_DATA"]>
  >),
  CRYPTOS_SETTINGS: z.object({
    id: z.string(),
    userId: z.string(),
    createdAt: z.coerce.string(),
    updatedAt: z.coerce.string(),
    defaultCurrency: z.string(),
    autoRefresh: z.object({
      id: z.string(),
      enabled: z.coerce.boolean(),
      cryptosSettingsId: z.string(),
      valueMs: z.coerce.number().default(-1),
    } satisfies ZodShape<NonNullableDeep<CryptosSettings["autoRefresh"]>>),
    notifications: z.object({
      id: z.string(),
      enabled: z.coerce.boolean(),
      time: z.enum(CryptoInterval).default(CryptoInterval.m30),
      cryptosSettingsId: z.string(),
    } satisfies ZodShape<NonNullableDeep<CryptosSettings["notifications"]>>),
  } satisfies ZodShape<NonNullableDeep<CryptosSettings>>),
};

const logger = new Logger("AuthVariables");

export const AUTH_CODE_EXPIRATION = 600;
export const AUTH_CODE_MAX_ATTEMPTS = 5;

export const DATA_REASONS = reasonNotification.map((reason) => ({ reason }));

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
        userConfig: true,
        cryptosSettings: {
          include: { autoRefresh: true, notifications: true },
        },
      },
    });

    if (!USER || !USER.userConfig) return null;

    const { userConfig, password: _, cryptosSettings, ...user } = USER;

    let date = -1;
    if (rememberMe) date = getDateWithTimeAhead({ days: 15 }).getTime();

    const [USER_DATA, CRYPTOS_SETTINGS] = await Promise.all([
      z.parseAsync(SCHEMAS.USER_DATA, user),
      cryptosSettings
        ? z.parseAsync(SCHEMAS.CRYPTOS_SETTINGS, cryptosSettings)
        : Promise.resolve(null),
    ]);

    let storageData: Partial<ExpectedStorageTypes<"BOTH">> = {
      LANGUAGE: userConfig.language,
      USER_DATA,
      SESSION_EXPIRY: date,
      HAS_ADMIN_ACCESS: userConfig.hasAdmin,
      CRYPTOS_SETTINGS,
      LAST_UPDATE_CHECK: Date.now(),
      USER_SESSION_TOKEN_STORAGE: token,
    };

    if (userConfig.hasAdmin) {
      //TODO: Implement admin sections
      storageData = {
        ...storageData,
      };
    }

    return storageData;
  } catch (error) {
    logger.error(chalk.red("Error fetching storage data:"), error);
    return null;
  }
};

declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Express {
    interface Request {
      user: { token: JWT };
    }
  }
}

type TokenJWT = {
  email: string;
  userId: string;
  deviceId: string;
  notificationToken: string;
};

const expiresIn = "17d";

export class JWT {
  static #secret = getEnvValue("JWT_SECRET");

  #data: TokenJWT;
  #token: string | null = null;
  #initToken: string | null = null;

  private static generateToken(data: TokenJWT): string | null {
    return jwt.sign(
      data,
      this.#secret,
      !(data as { exp?: number }).exp ? { expiresIn } : undefined,
    );
  }

  private static verifyToken(token: string): TokenJWT {
    return jwt.verify(token, this.#secret) as TokenJWT;
  }

  public async uploadToken(): Promise<
    DB["TablesServer"]["UserSessions"] | Error
  > {
    try {
      const data = this.data;
      const token = this.token;

      const userSession = await withTransaction(async (tx) => {
        const [session] = await Promise.all([
          tx.userSessions.upsert({
            where: {
              userId_deviceId: {
                userId: data.userId,
                deviceId: data.deviceId,
              },
            },
            create: {
              token,
              userId: data.userId,
              deviceId: data.deviceId,
            },
            update: { token },
          }),
          Validations.isValidPushToken(data.notificationToken)
            ? tx.pushTokens.upsert({
                update: { createdAt: new Date() },
                where: {
                  token_userId: {
                    token: data.notificationToken,
                    userId: data.userId,
                  },
                },
                create: {
                  token: data.notificationToken,
                  userId: this.#data.userId,
                },
              })
            : Promise.resolve(),
        ]);

        return session;
      });

      return userSession;
    } catch (error) {
      logger.error(chalk.red("Error uploading JWT token:"), error);
      return error instanceof Error ? error : new Error(String(error));
    }
  }

  public get newToken(): string | null {
    const prevToken = this.#token;

    try {
      if (this.#initToken === this.#token)
        return (this.#token = JWT.generateToken(this.#data));
      else return this.#token;
    } catch {
      return null;
    } finally {
      this.#initToken = prevToken;
    }
  }

  public get token(): string {
    if (!this.#token) this.#token = JWT.generateToken(this.#data);
    if (!this.#token) throw new Error("Error generating token");

    return this.#token;
  }

  public get data() {
    return { ...this.#data };
  }

  constructor(data: { token?: string; content?: TokenJWT }) {
    if (data.token) {
      const decoded = JWT.verifyToken(data.token);
      if (!decoded) throw new Error("Invalid token provided");

      this.#data = decoded;
      this.#token = data.token;
      this.#initToken = data.token;
    } else if (data.content) {
      const token = JWT.generateToken(data.content);
      if (!token) throw new Error("Error generating token with provided data");

      this.#data = data.content;
      this.#token = token;
      this.#initToken = token;
    } else {
      throw new Error(
        "Either token or content must be provided to initialize JWT",
      );
    }
  }
}
