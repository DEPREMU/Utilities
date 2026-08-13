import { prisma } from "@/database/postgres";
import { getHandlerPost, Logger, STATUS_RESPONSE } from "@common";
import { getLinkImageStreamer, isLiveStreamer } from "../common";

export const handleAddStreamerByUserId = getHandlerPost(
  "/streamers",
  "/add",
  { body: { userId: "string", streamerName: "string" } },
  async ({ body: params }, sendResponse) => {
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
      } else {
        const userStreamer = await prisma.userStreamers.findUnique({
          where: {
            userId_streamerId: { userId, streamerId: existingStreamer.id },
          },
        });

        if (!userStreamer) {
          await prisma.userStreamers.create({
            data: {
              user: { connect: { userId } },
              streamer: { connect: { id: existingStreamer.id } },
            },
          });
        }
      }

      const streamerWithLiveStatus = {
        ...existingStreamer,
        isLive: await isLiveStreamer(existingStreamer.name),
      };

      sendResponse(STATUS_RESPONSE.SUCCESS, {
        streamer: streamerWithLiveStatus,
      });
    } catch (error) {
      Logger.error("Error adding streamer by user ID:", error);
      sendResponse(STATUS_RESPONSE.INTERNAL_SERVER_ERROR, {
        error: "Internal server error",
      });
    }
  },
);
