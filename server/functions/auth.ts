import jwt from "jsonwebtoken";
import chalk from "chalk";
import { Logger } from "@common";
import { prisma } from "@/database/postgres.ts";
import { getEnvValue } from "@/env.ts";

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
    DB["Tables"]["UserSessions"] | Error
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
            token: this.token,
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
