import axios from "axios";
import chalk from "chalk";
import { showError } from "../functions/logger.ts";
import { getHandlerPost } from "../functions/getHandlerPost.ts";
import { insertIntoTable } from "../database/functions.ts";
import { RequestAddStreamer, RequestGetIsLiveStreamer } from "@types";

const getLinkImageStreamer = async (streamer: string) => {
  try {
    streamer = streamer.toLowerCase().replace(/\s+/g, "");
    const { data } = await axios.get(`https://www.twitch.tv/${streamer}`);
    if (!data) return;
    const imageElement = data
      .split(">")
      .find((e: string) => e.includes("og:image"));

    if (!imageElement) return;
    const image = imageElement
      .split(" ")
      .find((e: string) => e.includes("content="))
      // eslint-disable-next-line quotes
      .split('"')[1];

    return image;
  } catch (error) {
    showError("Error fetching streamer image:", error);
    return;
  }
};

export const isLiveStreamer = async (streamer: string): Promise<boolean> => {
  try {
    if (!streamer) return false;
    streamer = streamer.toLowerCase().replace(/\s/g, "");
    const { data }: { data: string } = await axios.get(
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
    showError("Error checking if streamer is live:", error);
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
      showError(chalk.red("Error in getIsLiveStreamer:"), error);
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
    const { name, userId } = body as RequestAddStreamer;

    if (!name || !userId)
      return sendResponse("BAD_REQUEST", {
        success: false,
        error: "Streamer name and User ID are required",
      });

    try {
      const [, result] = await Promise.all([
        insertIntoTable("UserNotificationsConfig", {
          enabled: false,
          interval: -1,
          paused: false,
          pauseTime: -1,
          userId,
          streamer: name,
          reason: "streamers",
          updatedAt: new Date().toISOString(),
        }),
        insertIntoTable("Streamers", {
          name,
          userId,
          linkImage: await getLinkImageStreamer(name),
        }),
      ]);

      const data = result.data?.[0];

      if (!data)
        return sendResponse("INTERNAL_SERVER_ERROR", {
          success: false,
          error: "Failed to add streamer: " + result.error || "Unknown error",
        });

      const streamer = data
        ? { ...data, isLive: await isLiveStreamer(data.name) }
        : null;

      if (result.error)
        return sendResponse("INTERNAL_SERVER_ERROR", {
          success: false,
          error: `Failed to add streamer: ${result.error}`,
        });

      sendResponse("SUCCESS", { streamer, success: true });
    } catch (error) {
      sendResponse("INTERNAL_SERVER_ERROR", {
        success: false,
        error: `Failed to add streamer: ${error instanceof Error ? error.message : String(error)}`,
      });
    }
  },
);
