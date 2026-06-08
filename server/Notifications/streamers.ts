import chalk from "chalk";
import { prisma } from "@/database/postgres.ts";
import { isLiveStreamer } from "@/routes/socialMedia.ts";
import { sendFCMNotification } from "@/firebase/admin.ts";
import { ChannelsId, ScreensAvailable } from "@types";
import { t, Logger, languagesSupported, Helper } from "@common";

const notificationsSent: Record<
  string,
  { streamer: string; timestamp: number } | undefined
> = {};

const handleSendNotificationsStreamers = async () => {
  const USERS = await prisma.users.findMany({
    where: {
      streamers: { some: { name: { not: "" } } },
      pushTokens: { some: { token: { not: "" } } },
      notificationsConfigs: {
        some: { reason: "allNotifications", enabled: true },
      },
    },
    include: {
      streamers: {
        where: { name: { not: "" }, linkImage: { not: "" } },
        select: { name: true, linkImage: true },
      },
      pushTokens: {
        where: { token: { not: "" } },
        select: { token: true },
      },
      userConfig: { select: { language: true } },
      notificationsConfigs: {
        where: {
          OR: [
            { reason: "streamers", enabled: true },
            { reason: "allNotifications", enabled: true },
          ],
        },
      },
    },
  });

  const users = USERS.map((u) => {
    const streamersSet = new Set<string>();
    const streamers = u.streamers.map((s) => {
      const name = s.name.toLowerCase();
      streamersSet.add(name);

      return { ...s, name };
    });

    const config = u.notificationsConfigs.find(
      (nc) => nc.reason === "allNotifications",
    );
    if (!config) return null;

    return {
      ...u,
      streamers,
      streamersSet,
    };
  }).filter(
    (
      u,
    ): u is NonNullable<typeof u> & {
      userConfig: NonNullable<NonNullable<typeof u>["userConfig"]>;
    } => {
      return (
        !!u &&
        u.streamers.length > 0 &&
        u.pushTokens.length > 0 &&
        !!u.userConfig
      );
    },
  );

  const streamers = new Map<string, (typeof users)[0]["streamers"][0]>(
    users.flatMap((u) => u.streamers.map((s) => [s.name, s])),
  );

  const liveStatusesMap = await Promise.all(
    [...streamers].map(async ([streamer, streamerData]) => {
      const usersConfig = users
        .filter((u) => u.streamersSet.has(streamer) && u.userConfig)
        .map((u) => u.userConfig);

      if (usersConfig.length === 0) return null;

      const isLive = await isLiveStreamer(streamer);
      const image = streamerData.linkImage || undefined;

      return {
        image,
        isLive,
        streamer,
        usersConfig,
      };
    }),
  );
  const liveStatuses = liveStatusesMap.filter(
    (status): status is NonNullable<typeof status> & { isLive: true } =>
      !!status && status.isLive,
  );

  const channelId: ChannelsId = "streamers";
  const data: { screen: ScreensAvailable } = {
    screen: "SocialMedia",
  };

  await Promise.all(
    liveStatuses.map(async (status) => {
      const config = { streamer: status.streamer };

      const translations = Helper.Object.fromEntries(
        languagesSupported.map((lang) => {
          return [
            lang,
            {
              body: t("streamerLiveNotification", lang, config),
              title: t("streamerLiveNotificationTitle", lang, config),
            },
          ];
        }),
      );

      await Promise.all(
        users.map(async (user) => {
          try {
            if (!user.streamersSet.has(status.streamer)) return;
            if (user.pushTokens.length === 0) return;
            if (user.notificationsConfigs.some((nc) => !nc.enabled)) return;

            const notificationSent = notificationsSent[user.userId];
            if (!notificationSent) {
              notificationsSent[user.userId] = {
                streamer: status.streamer,
                timestamp: Date.now(),
              };
              return;
            }

            if (notificationSent.streamer === status.streamer) {
              if (notificationSent.timestamp + 8 * 60 * 60 * 1000 > Date.now())
                return;
              else {
                notificationsSent[user.userId] = {
                  streamer: status.streamer,
                  timestamp: Date.now(),
                };
              }
            }

            const lang = user.userConfig.language;
            const { title, body } = translations[lang];

            await sendFCMNotification(
              user.pushTokens.map((pt) => pt.token),
              { title, body },
              channelId,
              {
                ...data,
                ...(status.image && { image: status.image }),
              },
            );
          } catch (error) {
            Logger.error(
              chalk.red(
                `Error sending notification to user ${user.userId} for streamer ${status.streamer}:`,
              ),
              error,
            );
          }
        }),
      );
    }),
  );
};

export const getInterval = () => {
  Logger.log(chalk.blue("Starting streamers interval..."));

  return setInterval(handleSendNotificationsStreamers, 5000);
};

export default getInterval();
