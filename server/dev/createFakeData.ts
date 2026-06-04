import {
  Tables,
  TablesKeys,
  RequestAuth,
  ResponseAuth,
  RoutesPostAPI,
} from "@types";
import axios from "axios";
import chalk from "chalk";
import { pool } from "@/database/postgres";
import { Logger } from "@common";
import { randomUUID } from "crypto";
import { insertIntoTable } from "@/database/functions";
import { host, port, TABLE_MAP } from "@/config";

const createRandomUser = async (): Promise<{
  email: string;
  password: string;
}> => {
  try {
    const email = `user${Math.floor(Math.random() * 1000000)}@example.com`;
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

let userIdPromise = getUserId().catch((error) => {
  Logger.error(chalk.red("Error getting user ID for fake data:"), error);
  process.exit(1);
});

const getFakeDataForTable = async <T extends TablesKeys>(
  tableName: T,
  len: number = 1,
): Promise<Tables[T][]> => {
  const data: unknown[] = [];

  for (let i = 0; i < len; i++) {
    const createdAt = new Date(Date.now() - i * 1000 * 60).toISOString();
    const userId = await userIdPromise;

    switch (tableName) {
      case "ClipboardSync":
        data.push({
          userId,
          createdAt,
          content: `Fake clipboard content ${i + 1}`,
          deviceId: `device-${i + 1}`,
        } satisfies Tables["ClipboardSync"]);
        break;
      case "Cryptos":
        data.push({
          userId,
          symbol: "BTC",
          amount: String(1000 + i * 10),
          baseCoin: "USD",
          quoteCoin: "BTC",
          datePurchased: createdAt,
          firstPricePurchased: new Date(createdAt).getTime(),
        } satisfies Tables["Cryptos"]);
        break;
      case "CryptosSettings":
        data.push({
          userId,
          createdAt,
          updatedAt: createdAt,
          autoRefresh: { valueMs: 5 * 60 * 1000, enabled: true },
          notifications: { valueMs: 60 * 60 * 1000, enabled: true },
          defaultCurrency: "USDT",
        } satisfies Tables["CryptosSettings"]);
        break;
      case "DownDetector":
        data.push({
          userId,
          createdAt,
          url: `https://fakeurl${i + 1}.com`,
          sendNotification: true,
        } satisfies Tables["DownDetector"]);
        break;
      case "Logs": {
        const randomNum = Math.random() * 10;

        data.push({
          type: randomNum < 3 ? "log" : randomNum < 6 ? "warn" : "error",
          userId,
          message: `This is a fake log message ${i + 1}`,
          deviceId: `device-${i + 1}`,
          timestamp: createdAt,
          deviceName: `Device ${i + 1}`,
        } satisfies Tables["Logs"]);
        break;
      }
      case "Notes":
        data.push({
          userId,
          createdAt,
          title: `Fake Note ${i + 1}`,
          sources: null,
          content: `This is a fake note content ${i + 1}`,
          updatedAt: createdAt,
        } satisfies Tables["Notes"]);
        break;
      case "PushTokens":
        data.push({
          userId,
          createdAt,
          token: `fake-push-token-${i + 1}`,
        } satisfies Tables["PushTokens"]);
        break;
      case "Streamers":
        data.push({
          userId,
          name: `Fake Streamer ${i + 1}`,
          linkImage: `https://fakeimage${i + 1}.com/image.png`,
        } satisfies Tables["Streamers"]);
        break;
      case "UserConfig":
        data.push({
          userId,
          createdAt,
          theme: i % 2 === 0 ? "light" : "dark",
          hasAdmin: i % 3 === 0,
          language: i % 2 === 0 ? "en" : "es",
          updatedAt: createdAt,
        } satisfies Tables["UserConfig"]);
        break;
      case "UserNotificationsConfig":
        data.push({
          userId,
          createdAt,
          paused: i % 3 === 0,
          reason: "locationEnabled",
          enabled: i % 2 === 0,
          updatedAt: createdAt,
          pauseTime: i % 3 === 0 ? 60 * 60 * 1000 : -1,
        } satisfies Tables["UserNotificationsConfig"]);
        break;
      case "UserSessions":
        data.push({
          userId,
          createdAt,
          token: `fake-session-token-${i + 1}`,
          deviceId: `device-${i + 1}`,
          updatedAt: createdAt,
        } satisfies Tables["UserSessions"]);
        break;
      case "Users":
        data.push({
          userId,
          createdAt,
          name: `Fake User ${i + 1}`,
          phone: `+1234567890${i + 1}`,
          email: `user${i + 1}@example.com`,
          password: `hashedpassword${i + 1}`,
          updatedAt: createdAt,
          description: `This is a fake user description for user-${i + 1}`,
        } satisfies Tables["Users"]);
        break;
      default:
        return [] as Tables[T][];
    }
  }

  return data as Tables[T][];
};

const getCountInTable = async (tableKey: TablesKeys): Promise<number> => {
  const client = await pool.connect();
  try {
    const res = await client.query(
      `SELECT COUNT(*) FROM "${TABLE_MAP[tableKey]}";`,
    );
    const count = res.rows[0]?.count;
    return typeof count === "string" ? parseInt(count, 10) : count || 0;
  } catch (error) {
    Logger.error(
      chalk.red(`Error counting records in table "${tableKey}":`),
      error,
    );
    return 0;
  } finally {
    client.release();
  }
};

export const createFakeData = async () => {
  const tables = Object.entries(TABLE_MAP) as [TablesKeys, string][];
  const MIN_RECORDS = 5000;
  const chunkSize = 100;

  await Promise.all(
    tables.map(async ([tableKey, tableName]) => {
      let count = await getCountInTable(tableKey);

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

        if (tableName === TABLE_MAP.Users) {
          await Promise.all(
            Array.from({ length: Math.floor(chunk / 3) }, createRandomUser),
          );
        } else {
          const fakeData = await getFakeDataForTable(tableKey, chunk);
          const res = await insertIntoTable(tableKey, fakeData as never);
          if (res.error) {
            Logger.error(
              `Error inserting fake data into table "${tableName}":`,
              fakeData,
              res.error,
            );
          }
        }

        count = await getCountInTable(tableKey);
      }

      Logger.log(
        chalk.green(
          `Inserted fake data into table ${tableKey}. Current count: ${count}`,
        ),
      );
    }),
  );
};
