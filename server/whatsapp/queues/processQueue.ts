import chalk from "chalk";
import fs from "fs/promises";
import { Logger } from "@common";
import { prisma } from "@/database/postgres";
import { getBotMessage } from "../language";
import { getRedisClient } from "../../redis/client";
import { Queue, Worker, Job } from "bullmq";
import { injectExifIntoWebp } from "@commonSrc/serverOrElectron/whatsapp/metadata";
import { convertImageToStickerWebp } from "@commonSrc/serverOrElectron/whatsapp/converter";
import { enqueueWhatsAppDeliveryJob } from "./deliveryQueue";
import { WhatsAppStickerProcessJobData } from "@types";
import { deleteTempFile, saveTempMedia } from "../tempMedia";

const logger = new Logger("WhatsAppProcessQueue");

export const PROCESS_QUEUE_NAME = "whatsapp-sticker-process";

let processQueue: Queue<WhatsAppStickerProcessJobData> | null = null;
let processWorker: Worker<WhatsAppStickerProcessJobData> | null = null;

export interface GatewayErrorSender {
  sendTextMessage: (
    recipientId: string,
    text: string,
    quotedMessageId?: string,
  ) => Promise<boolean>;
}

let activeErrorSender: GatewayErrorSender | null = null;

export const setProcessErrorSender = (
  sender: GatewayErrorSender | null,
): void => {
  activeErrorSender = sender;
};

export const getProcessQueue = (): Queue<WhatsAppStickerProcessJobData> => {
  if (processQueue) {
    return processQueue;
  }

  const redisConnection = getRedisClient();

  processQueue = new Queue<WhatsAppStickerProcessJobData>(PROCESS_QUEUE_NAME, {
    connection: redisConnection,
    defaultJobOptions: {
      backoff: { type: "exponential", delay: 1500 },
      attempts: 2,
      removeOnFail: { age: 86400, count: 500 },
      removeOnComplete: { age: 3600, count: 200 },
    },
  });

  return processQueue;
};

export const enqueueWhatsAppProcessJob = async (
  data: WhatsAppStickerProcessJobData,
): Promise<Job<WhatsAppStickerProcessJobData>> => {
  const queue = getProcessQueue();
  const job = await queue.add("process-sticker", data);
  logger.log(
    chalk.cyan(
      `Sticker conversion job enqueued for ${data.senderId} (job id: ${job.id}, animated: ${data.isAnimated})`,
    ),
  );
  return job;
};

export const processStickerJob = async (
  job: Job<WhatsAppStickerProcessJobData>,
): Promise<void> => {
  const {
    lang,
    jobId,
    options,
    senderId,
    isLinked,
    messageId,
    enqueuedAt,
    isAnimated,
    tempInputPath,
  } = job.data;

  let inputBuffer: Buffer;
  try {
    inputBuffer = await fs.readFile(tempInputPath);
  } catch (error) {
    logger.error(
      chalk.red(`Failed to read input media at ${tempInputPath}:`),
      error,
    );
    await deleteTempFile(tempInputPath);
    throw error;
  }

  try {
    const convertedWebp = await convertImageToStickerWebp(inputBuffer, {
      isAnimated,
      quality: options.quality,
    });

    const finalWebp = await injectExifIntoWebp(convertedWebp, {
      packName: options.packName,
      authorName: options.authorName,
      emojis: options.emojis,
    });

    const tempStickerPath = await saveTempMedia(finalWebp, "webp");

    await deleteTempFile(tempInputPath);

    await enqueueWhatsAppDeliveryJob({
      jobId,
      messageId,
      recipientId: senderId,
      tempStickerPath,
      isAnimated,
      lang,
      processingDurationMs: Date.now() - enqueuedAt,
      enqueuedAt,
    });
  } catch (error) {
    logger.error(
      chalk.red(`Sticker conversion failed for ${senderId} (job: ${jobId}):`),
      error,
    );

    await deleteTempFile(tempInputPath);

    try {
      await prisma.whatsAppJobAudit.create({
        data: {
          senderId,
          isLinked,
          status: "FAILED",
          isAnimated,
          durationMs: Date.now() - enqueuedAt,
          errorCode: "CONVERSION_FAILED",
        },
      });
    } catch {
      return;
    }

    if (activeErrorSender) {
      const errorMessage = getBotMessage("processingError", lang);
      try {
        await activeErrorSender.sendTextMessage(
          senderId,
          errorMessage,
          messageId,
        );
      } catch {
        return;
      }
    }

    throw error;
  }
};

export const startProcessWorker = (
  errorSender?: GatewayErrorSender,
): Worker<WhatsAppStickerProcessJobData> => {
  if (errorSender) {
    setProcessErrorSender(errorSender);
  }

  if (processWorker) {
    return processWorker;
  }

  const redisConnection = getRedisClient();

  processWorker = new Worker<WhatsAppStickerProcessJobData>(
    PROCESS_QUEUE_NAME,
    processStickerJob,
    {
      connection: redisConnection,
      concurrency: 3,
    },
  );

  processWorker.on("failed", (job, error) => {
    logger.error(
      chalk.red(
        `Process job ${job?.id} failed permanently for sender ${job?.data?.senderId}:`,
      ),
      error,
    );
  });

  logger.log(
    chalk.blue(
      "BullMQ WhatsApp Sticker Process Worker initialized (concurrency: 3)",
    ),
  );
  return processWorker;
};

export const closeProcessWorker = async (): Promise<void> => {
  if (processWorker) {
    await processWorker.close();
    processWorker = null;
  }
};

export const closeProcessQueue = async (): Promise<void> => {
  if (processQueue) {
    await processQueue.close();
    processQueue = null;
  }
};
