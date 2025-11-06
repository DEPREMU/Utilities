import {
  Streamer,
  ChannelsId,
  UserConfig,
  PushTokens,
  ScreensAvailable,
  LanguagesSupported,
  UserNotificationsConfig,
} from "@types";
import chalk from "chalk";
import { t } from "../translations/index.ts";
import { dataDatabase } from "./fetchData.ts";
import { isLiveStreamer } from "../routes/socialMedia.ts";
import { sendFCMNotification } from "../firebase/admin.ts";

const notificationsSent: Record<
  string,
  { streamer: string; timestamp: number }
> = {};

const handleSendNotificationsStreamers = async () => {
  const pushTokens: PushTokens[] | null = dataDatabase.PushTokens;
  const tableStreamers: Streamer[] | null = dataDatabase.Streamers;
  const usersConfig: Record<string, UserConfig> | null =
    dataDatabase.UserConfig.reduce(
      (acc, config) => {
        if (config.userId) acc[config.userId] = config;
        return acc;
      },
      {} as Record<string, UserConfig>,
    );
  const notificationsConfig: UserNotificationsConfig[] | null =
    dataDatabase.UserNotificationsConfig;

  if (!tableStreamers || !notificationsConfig || !pushTokens) return;

  const streamersSet = new Set(tableStreamers.map((s) => s.name.toLowerCase()));
  const streamers = Array.from(streamersSet);

  const notificationsEnabled = Object.fromEntries(
    notificationsConfig
      .filter((config) => config.reason === "allNotifications" && config.userId)
      .map((config) => [config.userId, config]),
  );

  const pushTokensUsers = pushTokens.reduce(
    (acc, userToken) => {
      if (!acc[userToken.userId]) acc[userToken.userId] = { tokens: [] };
      if (userToken.token) {
        acc[userToken.userId].tokens.push(userToken.token);
      }
      return acc;
    },
    {} as Record<string, { tokens: string[] }>,
  );

  const liveStatuses = (
    await Promise.all(
      streamers.map(async (streamer) => {
        const isLive = await isLiveStreamer(streamer);
        const usersConfig = notificationsConfig.filter((config) =>
          config.streamer?.toLowerCase().includes(streamer),
        );
        const image = tableStreamers.find(
          (s) => s.name.toLowerCase() === streamer,
        )?.linkImage;
        return {
          streamer,
          isLive,
          usersConfig,
          ...(image ? { image } : {}),
        };
      }),
    )
  ).filter((status) => status.isLive);

  const channelId: ChannelsId = "streamers";
  const data: { screen: ScreensAvailable } = { screen: "SocialMedia" };

  for (const status of liveStatuses) {
    for (const userConfig of status.usersConfig) {
      if (!userConfig.enabled) continue;
      if (!userConfig.userId) continue;
      if (!notificationsEnabled[userConfig.userId]?.enabled) continue;
      if (!pushTokensUsers[userConfig.userId]?.tokens) continue;
      if (
        notificationsSent[userConfig.userId]?.streamer === status.streamer &&
        (notificationsSent[userConfig.userId]?.timestamp || 0) +
          8 * 60 * 60 * 1000 >
          Date.now()
      )
        continue;

      notificationsSent[userConfig.userId] = {
        streamer: status.streamer,
        timestamp: Date.now(),
      };

      const lang: LanguagesSupported =
        (usersConfig?.[userConfig.userId]?.language as LanguagesSupported) ||
        "en";

      const config = { streamer: status.streamer };
      const title = t("streamerLiveNotificationTitle", lang, config);
      const body = t("streamerLiveNotification", lang, config);

      console.log(
        chalk.green(
          `Sending notification to user ${userConfig.userId} that ${status.streamer} is live`,
        ),
        config,
        pushTokensUsers[userConfig.userId]?.tokens,
        title,
        body,
      );

      try {
        const tokens = pushTokensUsers?.[userConfig.userId]?.tokens || [];

        await sendFCMNotification(
          tokens,
          {
            title,
            body,
          },
          channelId,
          {
            screen: data.screen,
            ...(status.image && { image: status.image }),
          },
        );
      } catch (error) {
        console.error(chalk.red("Error sending push notification:"), error);
      }
    }
  }
};

export const getInterval = () => {
  console.log(chalk.blue("Starting streamers interval..."));

  return setInterval(handleSendNotificationsStreamers, 5000);
};

export default getInterval();
