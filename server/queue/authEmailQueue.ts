import { Logger } from "@common";
import { Queue, Job } from "bullmq";
import { QUEUE_NAME } from "./variables.ts";
import { getRedisClient } from "../redis/client.ts";

export interface AuthEmailJobData {
  to: string;
  code: string;
  flowType: "login" | "signin" | "resetPassword";
  approximateLocation: string;
  expirationMinutes: number;
  lang: "en" | "es";
}

let authEmailQueue: Queue<AuthEmailJobData> | null = null;

/**
 * Returns or initializes the BullMQ queue for authentication emails.
 *
 * @returns {Queue<AuthEmailJobData>} The initialized BullMQ queue instance
 */
export const getAuthEmailQueue = (): Queue<AuthEmailJobData> => {
  if (authEmailQueue) {
    return authEmailQueue;
  }

  const redisConnection = getRedisClient();

  authEmailQueue = new Queue<AuthEmailJobData>(QUEUE_NAME, {
    connection: redisConnection,
    defaultJobOptions: {
      attempts: 3,
      backoff: {
        type: "exponential",
        delay: 2000,
      },
      removeOnComplete: {
        age: 3600,
        count: 100,
      },
      removeOnFail: {
        age: 86400,
        count: 500,
      },
    },
  });

  return authEmailQueue;
};

/**
 * Enqueues a new passwordless authentication email delivery job.
 *
 * @param data - The email delivery payload parameters
 * @returns A promise resolving to the created BullMQ job
 */
export const enqueueAuthEmail = async (
  data: AuthEmailJobData,
): Promise<Job<AuthEmailJobData>> => {
  const queue = getAuthEmailQueue();
  const job = await queue.add("send-auth-email", data);
  Logger.log(`Authentication email queued for ${data.to} (job id: ${job.id})`);
  return job;
};

/**
 * Closes the authentication email queue connection gracefully.
 *
 * @returns A promise that resolves when the queue is closed
 */
export const closeAuthEmailQueue = async (): Promise<void> => {
  if (authEmailQueue) {
    await authEmailQueue.close();
    authEmailQueue = null;
  }
};
