import axios from "axios";
import chalk from "chalk";
import { Logger } from "@common";
import { prisma } from "@/database/postgres.ts";
import { getHandlerPost } from "@/functions/getHandlerPost.ts";
import { RequestGetIsLiveStreamer } from "@types";

const getLinkImageStreamer = async (streamer: string) => {
  try {
    streamer = streamer.toLowerCase().replace(/\s+/g, "");
    const { data } = await axios.get(`https://www.twitch.tv/${streamer}`);
    if (!data) return;
    const imageElement = data
      .split(">")
      .find((e: string) => e.includes("og:image"));

    if (!imageElement) return;
    const image: string = imageElement
      .split(" ")
      .find((e: string) => e.includes("content="))
      .split('"')[1];

    return image;
  } catch (error) {
    Logger.error("Error fetching streamer image:", error);
  }
};

export const isLiveStreamer = async (streamer: string): Promise<boolean> => {
  try {
    if (!streamer) return false;
    streamer = streamer.toLowerCase().replace(/\s/g, "");
    const { data } = await axios.get<string>(
      `https://www.twitch.tv/${streamer}`,
    );

    const script = data
      .split(">")
      .find((e: string) => e.includes("isLiveBroadcast"));
    if (!script) return false;

    const json = JSON.parse(script.replace("</script", ""));
    const isLive: boolean =
      json?.["@graph"]?.[0]?.publication?.isLiveBroadcast || false;
    return isLive;
  } catch (error) {
    Logger.error("Error checking if streamer is live:", error);
    return false;
  }
};

export const getIsLiveStreamer = getHandlerPost(
  "/getIsLiveStreamer",
  {
    streamer: "object",
  },
  async (body, sendResponse) => {
    const { streamer } = body as RequestGetIsLiveStreamer;

    try {
      if (!streamer || !streamer.name || streamer.name.trim() === "")
        return sendResponse("BAD_REQUEST", {
          success: false,
          error: "Streamer name is required",
        });

      const isLive = await isLiveStreamer(streamer.name);
      sendResponse("SUCCESS", {
        success: true,
        streamer: { ...streamer, isLive },
      });
    } catch (error) {
      Logger.error(chalk.red("Error in getIsLiveStreamer:"), error);
      sendResponse("INTERNAL_SERVER_ERROR", {
        success: false,
        error: "Failed to get live status of streamer",
      });
    }
  },
);

export const addStreamer = getHandlerPost(
  "/addStreamer",
  {
    name: "string",
    userId: "string",
  },
  async (body, sendResponse) => {
    const { name, userId } = body;

    if (!name || !userId)
      return sendResponse("BAD_REQUEST", {
        success: false,
        error: "Streamer name and User ID are required",
      });

    try {
      const [, data] = await Promise.all([
        prisma.userNotificationsConfig.update({
          where: {
            userId_reason: {
              userId,
              reason: "streamers",
            },
          },
          data: {
            streamers: {
              create: {
                paused: false,
                enabled: false,
                streamer: name,
                pauseTime: -1,
              },
            },
          },
        }),
        prisma.streamers.create({
          data: {
            name,
            userId,
            linkImage: await getLinkImageStreamer(name),
          },
        }),
      ]);

      const streamer = data
        ? { ...data, isLive: await isLiveStreamer(data.name) }
        : null;

      sendResponse("SUCCESS", { streamer, success: true });
    } catch (error) {
      sendResponse("INTERNAL_SERVER_ERROR", {
        success: false,
        error: `Failed to add streamer: ${error instanceof Error ? error.message : String(error)}`,
      });
    }
  },
);
