import { withTransaction } from "@/database/transaction.ts";
import { getHandlerPost, STATUS_RESPONSE } from "@common";
import { getLinkImageStreamer, isLiveStreamer } from "../common";

export const handleAddStreamerByUserId = getHandlerPost(
  "/streamers",
  "/add",
  async ({ body: params }, sendResponse) => {
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
  },
);
