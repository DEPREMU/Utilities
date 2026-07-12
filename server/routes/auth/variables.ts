import {
  Logger,
  reasonNotification,
  ExpectedStorageTypes,
  getDateWithTimeAhead,
  Helper,
} from "@common";
import jwt from "jsonwebtoken";
import chalk from "chalk";
import { prisma } from "@/database/postgres";
import { getEnvValue } from "@/env.ts";

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

    let storageData: Partial<ExpectedStorageTypes<"BOTH">> = {
      THEME: userConfig.theme,
      LANGUAGE: userConfig.language,
      USER_DATA: Helper.Object.changeType(user, {
        updatedAt: "string",
        createdAt: "string",
      }),
      SESSION_EXPIRY: date,
      HAS_ADMIN_ACCESS: userConfig.hasAdmin,
      CRYPTOS_SETTINGS: cryptosSettings
        ? Helper.Object.changeType(cryptosSettings, {
            createdAt: "string",
            updatedAt: "string",
          })
        : undefined,
      LAST_UPDATE_CHECK: Date.now(),
      USER_SESSION_TOKEN_STORAGE: token,
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

  public uploadToken = async (): Promise<
    DB["TablesServer"]["UserSessions"] | Error
  > => {
    try {
      const data = this.data;
      const token = this.token;

      const [userSession] = await Promise.all([
        prisma.userSessions.upsert({
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
        prisma.pushTokens.upsert({
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
          update: { createdAt: new Date() },
        }),
      ]);

      return userSession;
    } catch (error) {
      Logger.error(chalk.red("Error uploading JWT token:"), error);
      return error instanceof Error ? error : new Error(String(error));
    }
  };

  public get updatedToken(): string | null {
    try {
      if (this.#initToken === this.#token)
        return (this.#token = JWT.generateToken(this.#data));
      else return this.#token;
    } finally {
      this.#initToken = this.#token;
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
    } else {
      throw new Error(
        "Either token or content must be provided to initialize JWT",
      );
    }
  }
}
