import { prisma } from "@/database/postgres";
import { isLiveStreamer } from "../common";
import { Helper, Logger, STATUS_RESPONSE, getHandlerGet } from "@common";

export const handleGetStreamers = getHandlerGet(
  "/streamers",
  "/",
  async (_, sendResponse) => {
    try {
      const streamers = await prisma.streamers.findMany();

      sendResponse(STATUS_RESPONSE.SUCCESS, {
        streamers: streamers.map((s) =>
          Helper.Object.changeType(s, { createdAt: "string" }),
        ),
      });
    } catch (error) {
      Logger.error("Error fetching streamers:", error);
      sendResponse(STATUS_RESPONSE.INTERNAL_SERVER_ERROR, {
        error: "Internal server error",
      });
    }
  },
);

const STREAMERS_PER_PAGE = 10;

export const handleGetStreamersPage = getHandlerGet(
  "/streamers",
  "/page{/:page}",
  async ({ params }, sendResponse) => {
    try {
      const page = Helper.Object.getValue(params, "page", 1);

      const streamers = await prisma.streamers.findMany({
        take: STREAMERS_PER_PAGE,
        skip: (page - 1) * STREAMERS_PER_PAGE,
      });

      sendResponse(STATUS_RESPONSE.SUCCESS, {
        streamers: streamers.map((s) =>
          Helper.Object.changeType(s, { createdAt: "string" }),
        ),
      });
    } catch (error) {
      Logger.error("Error fetching streamers page:", error);
      sendResponse(STATUS_RESPONSE.INTERNAL_SERVER_ERROR, {
        error: "Internal server error",
      });
    }
  },
);

export const handleGetStreamerById = getHandlerGet(
  "/streamers",
  "/streamer/:streamerId",
  async ({ params }, sendResponse) => {
    try {
      const streamer = await prisma.streamers.findUnique({
        where: { id: params.streamerId },
      });

      if (!streamer) {
        sendResponse(STATUS_RESPONSE.NOT_FOUND, {
          error: "Streamer not found",
        });
        return;
      }

      sendResponse(STATUS_RESPONSE.SUCCESS, {
        streamer: {
          ...streamer,
          isLive: await isLiveStreamer(streamer.name),
          createdAt: streamer.createdAt.toISOString(),
        },
      });
    } catch (error) {
      Logger.error("Error fetching streamer by ID:", error);
      sendResponse(STATUS_RESPONSE.INTERNAL_SERVER_ERROR, {
        error: "Internal server error",
      });
    }
  },
);

export const handleGetStreamersByUserId = getHandlerGet(
  "/streamers",
  "/:userId{/:streamerId}",
  async ({ params }, sendResponse) => {
    try {
      const userId = Helper.Object.getValue(params, "userId", "");
      const streamerId = Helper.Object.getValue(params, "streamerId", "");

      if (!streamerId) {
        const streamers = await prisma.userStreamers.findMany({
          where: { userId },
          include: { streamer: true },
        });

        const streamersWithLiveStatus = await Promise.all(
          streamers.map(async (s) => ({
            ...s.streamer,
            isLive: await isLiveStreamer(s.streamer.name),
          })),
        );

        sendResponse(STATUS_RESPONSE.SUCCESS, {
          streamers: streamersWithLiveStatus.map((s) =>
            Helper.Object.changeType(s, { createdAt: "string" }),
          ),
        });
        return;
      }

      const streamer = await prisma.userStreamers.findUnique({
        where: { id: streamerId, userId },
        include: { streamer: true },
      });
      if (!streamer || !streamer.streamer) {
        sendResponse(STATUS_RESPONSE.SUCCESS, { error: "Streamer not found" });
        return;
      }

      sendResponse(STATUS_RESPONSE.SUCCESS, {
        streamers: [
          {
            ...streamer.streamer,
            isLive: await isLiveStreamer(streamer.streamer.name),
            createdAt: streamer.streamer.createdAt.toISOString(),
          },
        ],
      });
    } catch (error) {
      Logger.error("Error fetching streamers by user ID:", error);
      sendResponse(STATUS_RESPONSE.INTERNAL_SERVER_ERROR, {
        error: "Internal server error",
      });
    }
  },
);
