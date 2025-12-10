import jwt from "jsonwebtoken";
import env from "../env.ts";
import chalk from "chalk";
import { deleteInTable, insertIntoTable } from "database/functions.ts";

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

export const getJWTToken = (storedValues: TokenJWT): string => {
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

export const getJWTTokenAndUpload = async (tokenJWT: TokenJWT) => {
  const token = getJWTToken(tokenJWT);
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
};
