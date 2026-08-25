import { withTransaction } from "@/database/transaction.ts";
import { getLinkImageStreamer, isLiveStreamer } from "../common";
import { getHandlerPost, Logger, STATUS_RESPONSE } from "@common";

export const handleAddStreamerByUserId = getHandlerPost(
  "/streamers",
  "/add",
  { body: { userId: "string", streamerName: "string" } },
  async ({ body: params }, sendResponse) => {
    try {
      const { streamerName, userId } = params;

      const existingStreamer = await withTransaction(async (tx) => {
        let streamer = await tx.streamers.findUnique({
          omit: { createdAt: true },
          where: { name: streamerName },
        });

        if (!streamer) {
          const newStreamer = await tx.userStreamers.create({
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

          streamer = newStreamer.streamer;
        } else {
          const userStreamer = await tx.userStreamers.findUnique({
            where: {
              userId_streamerId: {
                userId,
                streamerId: streamer.id,
              },
            },
          });

          if (!userStreamer) {
            await tx.userStreamers.create({
              data: {
                user: { connect: { userId } },
                streamer: { connect: { id: streamer.id } },
              },
            });
          }
        }

        return streamer;
      });

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
