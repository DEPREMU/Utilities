import jwt from "jsonwebtoken";
import chalk from "chalk";
import { showError } from "./logger.ts";
import { getEnvValue } from "../env.ts";
import { wrapFunctionWithError } from "@common";
import { deleteInTable, insertIntoTable } from "../database/functions.ts";

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
  notificationToken: string;
};

const expiresIn = "17d";

export const getDateWithDaysAhead = (days: number): Date => {
  const date = new Date();
  date.setDate(date.getDate() + days);
  return date;
};

export const getJWTToken = wrapFunctionWithError(
  async (storedValues: TokenJWT) => {
    return jwt.sign(storedValues, getEnvValue("JWT_SECRET"), {
      expiresIn,
    });
  },
  true,
  async (_, errorMessage) => {
    showError(chalk.red("Error generating JWT token:"), errorMessage);
    return "";
  },
);

export const decodeJWTToken = wrapFunctionWithError(
  async (token: string) => {
    const decoded = jwt.verify(token, getEnvValue("JWT_SECRET")) as TokenJWT;
    return decoded;
  },
  true,
  async (_, errorMessage) => {
    showError(chalk.red("Error decoding JWT token:"), errorMessage);
    return null;
  },
);

export const getJWTTokenAndUpload = wrapFunctionWithError(
  async (tokenJWT: TokenJWT) => {
    const token = await getJWTToken(tokenJWT);
    await Promise.all([
      deleteInTable(tokenJWT.userId, "UserSessions", {
        deviceId: tokenJWT.deviceId,
        userId: tokenJWT.userId,
      }),
      deleteInTable(tokenJWT.userId, "PushTokens", {
        token: tokenJWT.notificationToken,
      }),
    ]);

    const dataInsert = await insertIntoTable("UserSessions", {
      userId: tokenJWT.userId,
      token,
      deviceId: tokenJWT.deviceId,
      updatedAt: new Date().toISOString(),
    });

    return dataInsert;
  },
  true,
  (_, errorMessage) => {
    showError(chalk.red("Error uploading JWT token:"), errorMessage);
    return { error: errorMessage } as unknown as ReturnType<
      typeof insertIntoTable<"UserSessions">
    >;
  },
);
