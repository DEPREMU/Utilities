import chalk from "chalk";
import { prisma } from "@/database/postgres";
import cliProgress from "cli-progress";
import { TABLE_MAP } from "@/config";
import { randomUUID } from "crypto";
import { TablesKeys } from "@types";
import { Helper, Logger, reasonNotification } from "@common";

const MIN_USERS_RECORDS = 5000;
const MIN_OTHER_RECORDS_PER_USER = 10;

class Random {
  static bool = () => Math.random() < 0.5;

  static string = () =>
    `${Math.random().toString(16).slice(2, 10)}-${randomUUID()}-${Date.now()}`;

  static number = (min: number, max: number) =>
    Math.floor(Math.random() * (max - min + 1)) + min;

  static date = () =>
    new Date(
      Date.now() - Math.floor(Math.random() * 1000 * 60 * 60 * 24 * 365),
    );

  static booleanNullable = () =>
    Math.random() < 0.5 ? (Math.random() < 0.5 ? true : false) : null;

  static stringNullable = () => (Math.random() < 0.5 ? Random.string() : null);

  static numberNullable = (min: number, max: number) =>
    Math.random() < 0.5 ? Random.number(min, max) : null;

  static dateNullable = () => (Math.random() < 0.5 ? Random.date() : null);
}

const getUserId = async (): Promise<string> => {
  try {
    const count = await getCountInTable("Users");

    const user = await prisma.users.findFirst({
      orderBy: { createdAt: "desc" },
      skip: Random.number(0, count - 1),
    });

    if (!user) throw new Error("Failed to find user for fake data generation");

    return user.userId;
  } catch (error) {
    Logger.error(chalk.red("Failed to fetch server:"), error);
    throw error instanceof Error ? error.message : String(error);
  }
};

const getCountInTable = async (
  tableKey: TablesKeys,
  userId?: string,
): Promise<number> => {
  try {
    switch (tableKey) {
      case "ClipboardSync":
        return await prisma.clipboardSync.count({ where: { userId } });
      case "Cryptos":
        return await prisma.cryptos.count({ where: { userId } });
      case "CryptosSettings":
        return await prisma.cryptosSettings.count({ where: { userId } });
      case "DownDetector":
        return await prisma.downDetector.count({ where: { userId } });
      case "Logs":
        return await prisma.logs.count({ where: { userId } });
      case "Notes":
        return await prisma.notes.count({ where: { userId } });
      case "PushTokens":
        return await prisma.pushTokens.count({ where: { userId } });
      case "UserConfig":
        return await prisma.userConfig.count({ where: { userId } });
      case "UserNotificationsConfig":
        return await prisma.userNotificationsConfig.count({
          where: { userId },
        });
      case "UserSessions":
        return await prisma.userSessions.count({ where: { userId } });
      case "Streamers":
        return await prisma.streamers.count({
          where: { userStreamers: { some: { userId } } },
        });
      case "Users":
        return await prisma.users.count({ where: { userId } });
    }
  } catch (error) {
    Logger.error(
      chalk.red(`Error counting records in table "${tableKey}":`),
      error,
    );
    return 0;
  }
};

const insertFakeDataIntoTable = async (
  tableKey: TablesKeys,
  chunk: number,
  userId: string,
) => {
  switch (tableKey) {
    case "ClipboardSync":
      await prisma.clipboardSync.createMany({
        data: Array.from({ length: chunk }).map(() => ({
          userId,
          content: Random.string(),
          deviceId: `device-${Math.random().toString(16).slice(2, 10)}`,
        })),
      });
      break;
    case "Cryptos":
      await prisma.cryptos.createMany({
        data: Array.from({ length: chunk }).map(() => ({
          userId,
          symbol: `BTC-${randomUUID()}${Date.now()}`,
          amount: Random.number(1, 9999999).toString(),
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
      await Promise.all(
        Array.from({ length: chunk }).map(async () => {
          const name = `streamer-${Date.now()}${Random.string()}`;

          await prisma.userStreamers.create({
            data: {
              streamer: {
                connectOrCreate: { where: { name }, create: { name } },
              },
              user: { connect: { userId } },
            },
          });
        }),
      );
      break;
    case "UserConfig":
      {
        const users = await prisma.users.findMany({
          take: chunk,
          select: { userId: true },
          orderBy: [{ userId: "asc" }],
        });
        await prisma.userConfig.createMany({
          data: users.map(({ userId }) => ({
            userId,
            theme: Math.random() < 0.5 ? "light" : "dark",
            hasAdmin: Math.random() < 0.5,
          })),
        });
      }
      break;
    case "UserNotificationsConfig":
      {
        const users = await prisma.users.findMany({
          take: chunk,
          select: { userId: true },
          orderBy: [{ userId: "desc" }],
        });
        await prisma.userNotificationsConfig.createMany({
          data: users.map(({ userId }) => ({
            userId,
            paused: Math.random() < 0.5,
            reason: "locationEnabled",
            enabled: Math.random() < 0.5,
            pauseTime: Math.random() < 0.5 ? 60 * 60 * 1000 : -1,
          })),
        });
      }
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
      {
        await Helper.Arrays.forEachQueue(
          10,
          Array.from({ length: chunk }),
          async () => {
            const createdAt = Random.date();
            const updatedAt = new Date();
            await prisma.users.create({
              data: {
                createdAt,
                updatedAt,
                name: Random.string(),
                phone: `+${Random.number(0, 9999999999999)}`,
                email: `user${Random.string()}@example.com`,
                password: `hashedPassword${Random.string()}`,
                description: Random.string(),

                cryptosSettings: {
                  create: {
                    createdAt,
                    updatedAt,
                    defaultCurrency: "USDT",
                    notifications: {
                      create: {
                        enabled: Random.bool(),
                        valueMs: Random.number(1, 60) * 1000,
                      },
                    },
                    autoRefresh: {
                      create: {
                        enabled: Random.bool(),
                        valueMs: Random.number(1, 60) * 1000,
                      },
                    },
                  },
                },
                clipboardSyncs: {
                  create: {
                    createdAt,
                    deleted: Random.bool(),
                    content: Random.string(),
                    deviceId: Random.string(),
                  },
                },
                cryptos: {
                  create: {
                    symbol: "USDTBTC",
                    amount: Random.number(0, 9999999999999).toString(),
                    baseCoin: "USDT",
                    quoteCoin: "BTC",
                    datePurchased: Random.date(),
                    firstPricePurchased: Random.number(0, 9999999999999),
                  },
                },
                downDetectors: {
                  create: {
                    createdAt,
                    url: `https://fakeurl${Random.string()}.com`,
                    sendNotification: Random.bool(),
                  },
                },
                logs: {
                  create: {
                    type: Random.bool()
                      ? "log"
                      : Random.bool()
                        ? "warn"
                        : "error",
                    message: Random.string(),
                    deviceId: `device-${Random.string()}`,
                    timestamp: Random.date(),
                    deviceName: `Device ${Random.string()}`,
                  },
                },
                notes: {
                  create: {
                    createdAt,
                    updatedAt,
                    title: Random.string(),
                    content: Random.string(),
                    isHidden: Random.bool(),
                    isPinned: Random.bool(),
                    richTextRuns: {
                      create: {
                        end: Random.number(0, 100),
                        start: 0,
                        color: "blue",
                        fontSize: 12,
                        fontStyle: "italic",
                        fontWeight: "bold",
                        fontFamily: "Arial",
                        textDecorationLine: "line_through",
                      },
                    },
                  },
                },
                pushTokens: {
                  create: {
                    createdAt,
                    token: Random.string(),
                  },
                },
                userConfig: {
                  create: {
                    createdAt,
                    updatedAt,
                    theme: "light",
                    hasAdmin: Random.bool(),
                    language: Random.bool() ? "en" : "es",
                  },
                },
                notificationsConfigs: {
                  createMany: {
                    data: reasonNotification.map((reason) => {
                      return {
                        createdAt,
                        updatedAt,
                        paused: Random.bool(),
                        enabled: Random.bool(),
                        pauseTime: Random.number(0, 60 * 60 * 1000),
                        reason,
                      };
                    }),
                  },
                },
                userSessions: {
                  createMany: {
                    data: Array.from({ length: Random.number(5, 20) }).map(
                      () => {
                        return {
                          createdAt,
                          updatedAt,
                          token: Random.string(),
                          deviceId: Random.string(),
                        };
                      },
                    ),
                  },
                },
                streamers: {
                  create: {
                    streamer: {
                      create: {
                        name: Random.string(),
                        createdAt,
                        linkImage: `https://${Random.string()}`,
                      },
                    },
                  },
                },
              },
            });
          },
        );
      }
      break;
  }
};

export const createFakeData = async () => {
  const tables = Helper.Object.keys(TABLE_MAP);
  const chunkSize = 100;

  const bar = new cliProgress.SingleBar(
    {
      format: chalk.blue(
        "Creating fake data {bar} {percentage}% | ETA: {eta}s | {value}/{total}",
      ),
    },
    cliProgress.Presets.shades_classic,
  );

  let progress = 0;
  bar.start(MIN_USERS_RECORDS * 2, progress);

  while (true) {
    const counts = await Promise.all(
      tables.map((tableKey) => {
        return getCountInTable(tableKey);
      }),
    );

    if (counts.every((c) => c >= MIN_USERS_RECORDS)) {
      bar.update((progress = MIN_USERS_RECORDS));
      break;
    }
    const minCount = Math.min(...counts);
    const chunkSizeForTable = Math.min(MIN_USERS_RECORDS - minCount, chunkSize);

    await insertFakeDataIntoTable("Users", chunkSizeForTable, "");

    progress += chunkSizeForTable;
    bar.update(progress);
  }

  await Helper.Arrays.forEachQueue(
    5,
    Array.from({ length: MIN_USERS_RECORDS }),
    async () => {
      const userId = await getUserId();

      await Helper.Arrays.forEachQueue(
        3,
        tables.filter(
          (t) => t !== "Users" && t !== "CryptosSettings" && t !== "UserConfig",
        ),
        async (tableKey) => {
          try {
            let attempts = 0;

            let count = await getCountInTable(tableKey, userId);

            if (count >= MIN_OTHER_RECORDS_PER_USER) return;

            while (MIN_OTHER_RECORDS_PER_USER > count && attempts++ < 100) {
              const chunk = Math.min(
                chunkSize,
                MIN_OTHER_RECORDS_PER_USER - count,
              );

              await insertFakeDataIntoTable(tableKey, chunk, userId);

              count = await getCountInTable(tableKey, userId);
            }
          } catch (error) {
            Logger.log(
              chalk.red(
                `Error occurred while inserting fake data into table ${tableKey}:`,
              ),
              error,
            );
          }
        },
      );

      bar.update(++progress);
    },
  );

  bar.stop();

  const messages = await Promise.all(
    tables.map(async (t) => [t, await getCountInTable(t)]),
  );

  Logger.log(
    chalk.green(
      "Fake data created successfully:\n",
      messages.map((m) => `${m[0]}: ${m[1]}`).join("\n"),
    ),
  );
};
