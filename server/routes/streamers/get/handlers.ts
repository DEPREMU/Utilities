import { prisma } from "@/database/postgres";
import { RequestError } from "@commonSrc/both/errors/Error";
import { isLiveStreamer } from "../common";
import { Helper, STATUS_RESPONSE, getHandlerGet } from "@common";

export const handleGetStreamers = getHandlerGet(
  "/streamers",
  "/",
  async (_, sendResponse) => {
    const streamers = await prisma.streamers.findMany();

    sendResponse(STATUS_RESPONSE.SUCCESS, {
      streamers: streamers.map((s) =>
        Helper.Object.changeType(s, { createdAt: "string" }),
      ),
    });
  },
);

const STREAMERS_PER_PAGE = 10;

export const handleGetStreamersPage = getHandlerGet(
  "/streamers",
  "/page{/:page}",
  async ({ params }, sendResponse) => {
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
  },
);

export const handleGetStreamerById = getHandlerGet(
  "/streamers",
  "/streamer/:streamerId",
  async ({ params }, sendResponse) => {
    const streamer = await prisma.streamers.findUnique({
      where: { id: params.streamerId },
    });

    if (!streamer)
      throw new RequestError(STATUS_RESPONSE.NOT_FOUND, "Streamer not found");

    sendResponse(STATUS_RESPONSE.SUCCESS, {
      streamer: {
        ...streamer,
        isLive: await isLiveStreamer(streamer.name),
        createdAt: streamer.createdAt.toISOString(),
      },
    });
  },
);

export const handleGetStreamersByUserId = getHandlerGet(
  "/streamers",
  "/:userId{/:streamerId}",
  async ({ params }, sendResponse) => {
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
    if (!streamer || !streamer.streamer)
      throw new RequestError(STATUS_RESPONSE.NOT_FOUND, "Streamer not found");

    sendResponse(STATUS_RESPONSE.SUCCESS, {
      streamers: [
        {
          ...streamer.streamer,
          isLive: await isLiveStreamer(streamer.streamer.name),
          createdAt: streamer.streamer.createdAt.toISOString(),
        },
      ],
    });
  },
);
