import chalk from "chalk";
import { prisma } from "@/database/postgres";
import { File, Logger } from "@common";
import { deleteTempFile } from "../tempMedia";
import { getRedisClient } from "../../redis/client";
import { Queue, Worker, Job } from "bullmq";
import { WhatsAppStickerDeliveryJobData } from "@types";

const logger = new Logger("WhatsAppDeliveryQueue");

export const DELIVERY_QUEUE_NAME = "whatsapp-sticker-delivery";

let deliveryQueue: Queue<WhatsAppStickerDeliveryJobData> | null = null;
let deliveryWorker: Worker<WhatsAppStickerDeliveryJobData> | null = null;

export interface GatewaySender {
  sendSticker: (
    recipientId: string,
    stickerBuffer: Buffer,
    quotedMessageId?: string,
  ) => Promise<boolean>;
  isGatewayConnected: () => boolean;
}

let activeGatewaySender: GatewaySender | null = null;

export const setDeliveryGatewaySender = (
  sender: GatewaySender | null,
): void => {
  activeGatewaySender = sender;
};

export const getDeliveryQueue = (): Queue<WhatsAppStickerDeliveryJobData> => {
  if (deliveryQueue) {
    return deliveryQueue;
  }

  const redisConnection = getRedisClient();

  deliveryQueue = new Queue<WhatsAppStickerDeliveryJobData>(
    DELIVERY_QUEUE_NAME,
    {
      connection: redisConnection,
      defaultJobOptions: {
        attempts: 3,
        backoff: {
          type: "exponential",
          delay: 2000,
        },
        removeOnComplete: {
          age: 3600,
          count: 200,
        },
        removeOnFail: {
          age: 86400,
          count: 500,
        },
      },
    },
  );

  return deliveryQueue;
};

export const enqueueWhatsAppDeliveryJob = async (
  data: WhatsAppStickerDeliveryJobData,
): Promise<Job<WhatsAppStickerDeliveryJobData>> => {
  const queue = getDeliveryQueue();
  const job = await queue.add("send-sticker", data);
  logger.log(
    chalk.cyan(
      `Delivery job queued for ${data.recipientId} (job id: ${job.id})`,
    ),
  );
  return job;
};

export const processDeliveryJob = async (
  job: Job<WhatsAppStickerDeliveryJobData>,
): Promise<void> => {
  const { recipientId, tempStickerPath, messageId, isAnimated, enqueuedAt } =
    job.data;

  if (!activeGatewaySender || !activeGatewaySender.isGatewayConnected()) {
    throw new Error("WhatsApp shared gateway is not currently connected");
  }

  let stickerBuffer: Buffer;
  try {
    stickerBuffer = Buffer.from(await new File(tempStickerPath).readFile());
  } catch (error) {
    logger.error(
      chalk.red(`Failed to read sticker file at ${tempStickerPath}:`),
      error,
    );
    throw error;
  }

  const sent = await activeGatewaySender.sendSticker(
    recipientId,
    stickerBuffer,
    messageId,
  );

  if (!sent) {
    throw new Error(`Failed to dispatch sticker message to ${recipientId}`);
  }

  try {
    await prisma.whatsAppJobAudit.create({
      data: {
        senderId: recipientId,
        isLinked: false,
        status: "COMPLETED",
        isAnimated,
        durationMs: Date.now() - enqueuedAt,
        errorCode: null,
      },
    });
  } catch {
    return;
  }

  logger.log(
    chalk.green(
      `Successfully delivered sticker to ${recipientId} in ${Date.now() - enqueuedAt}ms`,
    ),
  );

  await deleteTempFile(tempStickerPath);
};

export const startDeliveryWorker = (
  sender?: GatewaySender,
): Worker<WhatsAppStickerDeliveryJobData> => {
  if (sender) {
    setDeliveryGatewaySender(sender);
  }

  if (deliveryWorker) {
    return deliveryWorker;
  }

  const redisConnection = getRedisClient();

  deliveryWorker = new Worker<WhatsAppStickerDeliveryJobData>(
    DELIVERY_QUEUE_NAME,
    processDeliveryJob,
    {
      connection: redisConnection,
      concurrency: 1,
    },
  );

  deliveryWorker.on("failed", (job, error) => {
    logger.error(
      chalk.red(
        `Delivery job ${job?.id} failed for recipient ${job?.data?.recipientId}:`,
      ),
      error,
    );
    if (
      job?.data?.tempStickerPath &&
      job.attemptsMade >= (job.opts?.attempts || 3)
    ) {
      void deleteTempFile(job.data.tempStickerPath);
    }
  });

  logger.log(chalk.blue("BullMQ WhatsApp Sticker Delivery Worker initialized"));
  return deliveryWorker;
};

export const closeDeliveryWorker = async (): Promise<void> => {
  if (deliveryWorker) {
    await deliveryWorker.close();
    deliveryWorker = null;
  }
};

export const closeDeliveryQueue = async (): Promise<void> => {
  if (deliveryQueue) {
    await deliveryQueue.close();
    deliveryQueue = null;
  }
};
