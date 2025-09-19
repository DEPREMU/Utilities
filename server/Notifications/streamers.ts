import type {
  Streamer,
  ChannelsId,
  UserConfig,
  PushTokens,
  TablesKeys,
  ScreensAvailable,
  LanguagesSupported,
  UserNotificationsConfig,
} from "../../types/index.ts";
import chalk from "chalk";
import { t } from "../translations/index.ts";
import { supabase } from "../supabase/supabase.ts";
import { isLiveStreamer } from "../routes/socialMedia.ts";

const tableNameStreamers: TablesKeys = "Streamers";
const tableNameNotificationsConfig: TablesKeys = "UserNotificationsConfig";

const notificationsSent: Record<
  string,
  { streamer: string; timestamp: number }
> = {};

export const getInterval = () => {
  console.log(chalk.blue("Starting streamers interval..."));

  return setInterval(async () => {
    let pushTokens: PushTokens[] | null = null;
    let tableStreamers: Streamer[] | null = null;
    let usersConfig: Record<string, UserConfig> | null = null;
    let notificationsConfig: UserNotificationsConfig[] | null = null;

    try {
      tableStreamers = (await supabase.from(tableNameStreamers).select("*"))
        .data;

      notificationsConfig = (
        await supabase.from(tableNameNotificationsConfig).select("*")
      ).data;

      pushTokens = (await supabase.from("PushTokens").select("*")).data;

      usersConfig = Object.fromEntries(
        (await supabase.from("UserConfig").select("*")).data?.map((config) => [
          config.userId,
          config,
        ]) || [],
      );
    } catch (error) {
      console.error(
        chalk.red("Error fetching streamers or notifications config:"),
        error,
      );
    }

    if (!tableStreamers || !notificationsConfig || !pushTokens) return;

    const streamersSet = new Set(
      tableStreamers.map((s) => s.name.toLowerCase()),
    );
    const streamers = Array.from(streamersSet);

    const notificationsEnabled = Object.fromEntries(
      notificationsConfig
        .filter(
          (config) => config.reason === "allNotifications" && config.userId,
        )
        .map((config) => [config.userId, config]),
    );

    const pushTokensUsers = pushTokens.reduce(
      (acc, userToken) => {
        if (!acc[userToken.userId]) acc[userToken.userId] = { tokens: [] };
        if (userToken.token?.startsWith("ExponentPushToken"))
          acc[userToken.userId].tokens.push(userToken.token);
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

        try {
          fetch("https://exp.host/--/api/v2/push/send", {
            method: "POST",
            headers: {
              Accept: "application/json",
              "Accept-encoding": "gzip, deflate",
              "Content-Type": "application/json",
            },
            body: JSON.stringify(
              pushTokensUsers?.[userConfig.userId]?.tokens.map((to) => ({
                to,
                data,
                body,
                title,
                channelId,
                richContent: { image: status.image },
              })),
            ),
          })
            .then((r) => r.json())
            .then(({ data }) => {
              if (data.status !== "error") return;

              const errorData = data.message;
              console.error(
                chalk.red("Error sending push notification:"),
                errorData,
              );
            });
        } catch (error) {
          console.error(chalk.red("Error sending push notification:"), error);
        }
      }
    }
  }, 5000);
};

export const intervalId = getInterval();
