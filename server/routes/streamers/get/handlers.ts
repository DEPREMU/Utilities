import axios from "axios";
import { Logger } from "@common";
import { prisma } from "@/database/postgres";
import { getHandlerGet } from "@/functions/getHandlerGet";
import { StreamersFetch } from "@types";

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

export const handleGetStreamers = getHandlerGet(
  "/streamers",
  "/",
  {},
  async (_, sendResponse) => {
    try {
      const streamers = await prisma.streamers.findMany({
        omit: { createdAt: true },
      });

      sendResponse("SUCCESS", { streamers });
    } catch (error) {
      Logger.error("Error fetching streamers:", error);
      sendResponse("INTERNAL_SERVER_ERROR", { error: "Internal server error" });
    }
  },
);

const STREAMERS_PER_PAGE = 10;

export const handleGetStreamersPage = getHandlerGet(
  "/streamers",
  "/page/:page-number-optional",
  { page: ["number", "undefined"] },
  async (params, sendResponse) => {
    try {
      const page = params.page || 1;

      const streamers = await prisma.streamers.findMany({
        take: STREAMERS_PER_PAGE,
        omit: { createdAt: true },
        skip: (page - 1) * STREAMERS_PER_PAGE,
      });

      sendResponse("SUCCESS", { streamers });
    } catch (error) {
      Logger.error("Error fetching streamers page:", error);
      sendResponse("INTERNAL_SERVER_ERROR", { error: "Internal server error" });
    }
  },
);

export const handleGetStreamerById = getHandlerGet(
  "/streamers",
  "/:streamerId",
  { streamerId: "string" },
  async (params, sendResponse) => {
    try {
      const streamer = await prisma.streamers.findUnique({
        omit: { createdAt: true },
        where: { id: params.streamerId },
      });

      if (!streamer) {
        sendResponse("NOT_FOUND", { error: "Streamer not found" });
        return;
      }

      sendResponse("SUCCESS", {
        streamer: { ...streamer, isLive: await isLiveStreamer(streamer.name) },
      });
    } catch (error) {
      Logger.error("Error fetching streamer by ID:", error);
      sendResponse("INTERNAL_SERVER_ERROR", { error: "Internal server error" });
    }
  },
);

export const handleGetStreamersByUserId = getHandlerGet(
  "/streamers",
  "/:userId/:streamerId-optional",
  { userId: "string", streamerId: ["string", "undefined"] },
  async (params, sendResponse) => {
    try {
      const { streamerId, userId } = params;

      if (!streamerId) {
        const streamers = await prisma.userStreamers.findMany({
          where: { userId },
          include: { streamer: { omit: { createdAt: true } } },
        });

        const streamersWithLiveStatus = await Promise.all(
          streamers.map(async (s) => ({
            ...s.streamer,
            isLive: await isLiveStreamer(s.streamer.name),
          })),
        );

        const res = {
          streamers: streamersWithLiveStatus,
        } satisfies (StreamersFetch & { url: "/:userId" })["response"];

        sendResponse("SUCCESS", res as never);
        return;
      }

      const streamer = await prisma.userStreamers.findUnique({
        where: { id: streamerId, userId },
        include: { streamer: { omit: { createdAt: true } } },
      });
      if (!streamer || !streamer.streamer) {
        sendResponse("SUCCESS", { error: "Streamer not found" });
        return;
      }

      sendResponse("SUCCESS", {
        streamers: [
          {
            ...streamer.streamer,
            isLive: await isLiveStreamer(streamer.streamer.name),
          },
        ],
      });
    } catch (error) {
      Logger.error("Error fetching streamers by user ID:", error);
      sendResponse("INTERNAL_SERVER_ERROR", { error: "Internal server error" });
    }
  },
);

export const handleAddStreamerByUserId = getHandlerGet(
  "/streamers",
  "/add/:userId/:streamerName",
  { userId: "string", streamerName: "string" },
  async (params, sendResponse) => {
    try {
      const { streamerName, userId } = params;

      let existingStreamer = await prisma.streamers.findUnique({
        omit: { createdAt: true },
        where: { name: streamerName },
      });

      if (!existingStreamer) {
        const newStreamer = await prisma.userStreamers.create({
          data: {
            user: { connect: { userId } },
            streamer: {
              create: {
                name: streamerName,
                linkImage: (await getLinkImageStreamer(streamerName)) ?? null,
              },
            },
          },
          include: { streamer: { omit: { createdAt: true } } },
        });

        existingStreamer = newStreamer.streamer;
      }

      const streamerWithLiveStatus = {
        ...existingStreamer,
        isLive: await isLiveStreamer(existingStreamer.name),
      };

      sendResponse("SUCCESS", { streamer: streamerWithLiveStatus });
    } catch (error) {
      Logger.error("Error adding streamer by user ID:", error);
      sendResponse("INTERNAL_SERVER_ERROR", { error: "Internal server error" });
    }
  },
);
