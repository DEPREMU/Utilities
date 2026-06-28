import axios from "axios";
import chalk from "chalk";
import { Logger } from "@common";
import { prisma } from "@/database/postgres";
import { randomUUID } from "crypto";
import { host, port, TABLE_MAP } from "@/config";
import {
  TablesKeys,
  RequestAuth,
  ResponseAuth,
  RoutesPostAPI,
  Prisma,
} from "@types";

const createRandomUser = async (): Promise<{
  email: string;
  password: string;
}> => {
  try {
    const email = `user${randomUUID()}${Date.now()}@example.com`;
    const password = "Test123!";

    const signup = "/auth/signup" satisfies RoutesPostAPI;
    const res = await axios.post(`http://${host}:${port}/api${signup}`, {
      lang: "en",
      email,
      password,
    } satisfies RequestAuth<"signup">);
    const resData = res.data as ResponseAuth<"signup">;

    if (!resData.success) {
      Logger.error(
        chalk.red("Failed to create test user for fake data generation:"),
        resData.error,
      );
      process.exit(1);
    }

    return { email, password };
  } catch (error) {
    Logger.error(
      chalk.red("Failed to create test user for fake data generation:"),
      error,
    );
    process.exit(1);
  }
};

const getUserId = async (): Promise<string> => {
  const login = "/auth/login" satisfies RoutesPostAPI;

  try {
    const { email, password } = await createRandomUser();

    const resLogin = await axios.post(`http://${host}:${port}/api${login}`, {
      lang: "en",
      email,
      password,
      deviceId: `device-${randomUUID().slice(0, 8)}`,
      rememberMe: false,
      notificationToken: `fake-notification-token-${randomUUID().slice(0, 8)}`,
    } satisfies RequestAuth<"login">);
    const resLoginData = resLogin.data as ResponseAuth<"login">;

    if (resLoginData.user?.userId) return resLoginData.user.userId;
    else throw new Error("Failed to login test user: " + resLoginData.error);
  } catch (error) {
    Logger.error(chalk.red("Failed to fetch server:"), error);
    throw error instanceof Error ? error.message : String(error);
  }
};

const userIdPromise = getUserId().catch((error) => {
  Logger.error(chalk.red("Error getting user ID for fake data:"), error);
  process.exit(1);
});

const getCountInTable = async (tableKey: string): Promise<number> => {
  try {
    const count = await prisma[tableKey as unknown as "logs"].count();
    return count;
  } catch (error) {
    Logger.error(
      chalk.red(`Error counting records in table "${tableKey}":`),
      error,
    );
    return 0;
  }
};

const insertFakeDataIntoTable = async (
  tableName: string,
  tableKey: TablesKeys,
  chunk: number,
  userId: string,
) => {
  if (tableName === TABLE_MAP.Users) {
    await Promise.all(Array.from({ length: chunk }, createRandomUser));
  } else {
    switch (tableKey) {
      case "ClipboardSync":
        await prisma.clipboardSync.createMany({
          data: Array.from({ length: chunk }).map(() => ({
            userId,
            content: "",
            deviceId: `device-${Math.random().toString(16).slice(2, 10)}`,
          })),
        });
        break;
      case "Cryptos":
        await prisma.cryptos.createMany({
          data: Array.from({ length: chunk }).map(() => ({
            userId,
            symbol: `BTC-${randomUUID()}${Date.now()}`,
            amount: String(1000 + Math.random() * 1000),
            baseCoin: "USD",
            quoteCoin: "BTC",
            datePurchased: new Date(),
            firstPricePurchased: Date.now(),
          })),
        });
        break;
      case "CryptosSettings":
        await prisma.cryptosSettings.createMany({
          data: Array.from({ length: chunk }).map(() => ({
            userId,
            defaultCurrency: "USDT",
          })),
        });
        break;
      case "DownDetector":
        await prisma.downDetector.createMany({
          data: Array.from({ length: chunk }).map(() => ({
            userId,
            url: `https://fakeurl${Math.random().toString(16).slice(2, 10)}.com`,
            sendNotification: true,
          })),
        });
        break;
      case "Logs":
        await prisma.logs.createMany({
          data: Array.from({ length: chunk }).map(() => ({
            type:
              Math.random() < 0.33
                ? "log"
                : Math.random() < 0.5
                  ? "warn"
                  : "error",
            userId,
            message: "This is a fake log message",
            deviceId: `device-${Math.random().toString(16).slice(2, 10)}`,
            timestamp: new Date(),
            deviceName: `Device ${Math.random().toString(16).slice(2, 10)}`,
          })),
        });
        break;
      case "Notes":
        await prisma.notes.createMany({
          data: Array.from({ length: chunk }).map(() => ({
            userId,
            title: "Fake Note",
            content: "This is a fake note content",
          })),
        });
        break;
      case "PushTokens":
        await prisma.pushTokens.createMany({
          data: Array.from({ length: chunk }).map(() => ({
            userId,
            token: `fake-push-token-${Math.random().toString(16).slice(2, 10)}`,
          })),
        });
        break;
      case "Streamers":
        await prisma.streamers.createMany({
          data: Array.from({ length: chunk }).map(
            () =>
              ({
                name: `Fake Streamer ${Math.random().toString(16).slice(2, 10)}`,
                linkImage: `https://fakeimage${Math.random().toString(16).slice(2, 10)}.com/image.png`,
              }) satisfies Prisma.StreamersCreateArgs["data"],
          ),
        });
        break;
      case "UserConfig":
        await prisma.userConfig.createMany({
          data: Array.from({ length: chunk }).map(() => ({
            userId,
            theme: Math.random() < 0.5 ? "light" : "dark",
            hasAdmin: Math.random() < 0.5,
          })),
        });
        break;
      case "UserNotificationsConfig":
        await prisma.userNotificationsConfig.createMany({
          data: Array.from({ length: chunk }).map(() => ({
            userId,
            paused: Math.random() < 0.5,
            reason: "locationEnabled",
            enabled: Math.random() < 0.5,
            pauseTime: Math.random() < 0.5 ? 60 * 60 * 1000 : -1,
          })),
        });
        break;
      case "UserSessions":
        await prisma.userSessions.createMany({
          data: Array.from({ length: chunk }).map(() => ({
            userId,
            token: `fake-session-token-${Math.random().toString(16).slice(2, 10)}`,
            deviceId: `device-${Math.random().toString(16).slice(2, 10)}`,
          })),
        });
        break;
      case "Users":
        await prisma.users.createMany({
          data: Array.from({ length: chunk }).map(() => ({
            userId,
            name: `Fake User ${Math.random().toString(16).slice(2, 10)}`,
            phone: `+1234567890${Math.random().toString(16).slice(2, 10)}`,
            email: `user${Math.random().toString(16).slice(2, 10)}@example.com`,
            password: `hashedpassword${Math.random().toString(16).slice(2, 10)}`,
            description: `This is a fake user description for user-${Math.random().toString(16).slice(2, 10)}`,
          })),
        });
        break;
    }
  }
};

export const createFakeData = async () => {
  const tables = Object.entries(TABLE_MAP) as [TablesKeys, string][];
  const MIN_RECORDS = 5000;
  const chunkSize = 100;

  const userId = await userIdPromise;

  await Promise.all(
    tables.map(async ([tableKey, tableName]) => {
      try {
        const tableNamePrisma = tableKey[0].toLowerCase() + tableKey.slice(1);

        let count = await getCountInTable(tableNamePrisma);

        if (count >= MIN_RECORDS) {
          Logger.log(
            chalk.green(
              `Table "${tableName}" already has ${count} records. Skipping fake data insertion.`,
            ),
          );
          return;
        }

        while (MIN_RECORDS > count) {
          Logger.log(
            chalk.blue(
              `Current record count in table "${tableName}": ${count}. Creating fake data until it reaches at least ${MIN_RECORDS} records...`,
            ),
          );

          const chunk = Math.min(chunkSize, MIN_RECORDS - count);

          await insertFakeDataIntoTable(
            tableNamePrisma,
            tableKey,
            chunk,
            userId,
          );

          count = await getCountInTable(tableKey);
        }

        Logger.log(
          chalk.green(
            `Inserted fake data into table ${tableKey}. Current count: ${count}`,
          ),
        );
      } catch (error) {
        Logger.log(
          chalk.red(
            `Error occurred while inserting fake data into table ${tableKey}:`,
          ),
          error,
        );
      }
    }),
  );
};
