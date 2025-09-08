import type {
  LanguagesSupported,
  PushTokens,
  Streamer,
  TablesKeys,
  UserConfig,
  UserNotificationsConfig,
} from "../../types/index.ts";
import { isLiveStreamer } from "../routes/socialMedia.ts";
import { supabase } from "../supabase/supabase.ts";
import { t } from "../translations/index.ts";

const tableNameStreamers: TablesKeys = "Streamers";
const tableNameNotificationsConfig: TablesKeys = "UserNotificationsConfig";

const notificationsSent: Record<
  string,
  { streamer: string; timestamp: number }
> = {};

export const getInterval = () => {
  console.log("Starting streamers interval...");

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
      console.error("Error fetching streamers or notifications config:", error);
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

    const pushTokensUsers = Object.fromEntries(
      pushTokens
        .filter((token) => token.userId && token.token)
        .map((token) => [token.userId, token]),
    );

    const liveStatuses = (
      await Promise.all(
        streamers.map(async (streamer) => {
          const isLive = await isLiveStreamer(streamer);
          const usersConfig = notificationsConfig.filter((config) =>
            config.streamer?.toLowerCase().includes(streamer),
          );
          return { streamer, isLive, usersConfig };
        }),
      )
    ).filter((status) => status.isLive);

    for (const status of liveStatuses) {
      for (const userConfig of status.usersConfig) {
        if (
          !userConfig.enabled ||
          !userConfig.userId ||
          !notificationsEnabled[userConfig.userId]?.enabled ||
          !pushTokensUsers[userConfig.userId]?.token ||
          (notificationsSent[userConfig.userId]?.streamer === status.streamer &&
            (notificationsSent[userConfig.userId]?.timestamp || 0) +
              8 * 60 * 60 * 1000 >
              Date.now())
        )
          continue;

        notificationsSent[userConfig.userId] = {
          streamer: status.streamer,
          timestamp: Date.now(),
        };

        const title = t(
          "streamerLiveNotificationTitle",
          (usersConfig?.[userConfig.userId]?.language as LanguagesSupported) ||
            "en",
          {
            streamer: status.streamer,
          },
        );

        const body = t(
          "streamerLiveNotification",
          (usersConfig?.[userConfig.userId]?.language as LanguagesSupported) ||
            "en",
          {
            streamer: status.streamer,
          },
        );

        try {
          fetch("https://exp.host/--/api/v2/push/send", {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              to: pushTokensUsers?.[userConfig.userId]?.token,
              body,
              title,
            }),
          })
            .then((r) => r.json())
            .then(async ({ data }) => {
              if (data.status === "error") {
                const errorData = data.message;
                console.error("Error sending push notification:", errorData);
              } else
                console.log(
                  "Push notification sent successfully:",
                  JSON.stringify(
                    {
                      to: pushTokensUsers?.[userConfig.userId]?.token,
                      title,
                      body,
                      data,
                    },
                    null,
                    2,
                  ),
                );
              //! Delete
            });
        } catch (error) {
          console.error("Error sending push notification:", error);
        }
      }
    }
  }, 5000);
};

export const intervalId = getInterval();
