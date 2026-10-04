import React from "react";
import chalk from "chalk";
import { Logger } from "@common";
import { render } from "@react-email/render";
import { AuthEmail } from "../emails/AuthEmail.tsx";
import { QUEUE_NAME } from "./variables";
import { Worker, Job } from "bullmq";
import { getEnvValue } from "../env";
import { getRedisClient } from "../redis/client";
import { AuthEmailJobData } from "./authEmailQueue";
import nodemailer, { type Transporter, type SentMessageInfo } from "nodemailer";

let authEmailWorker: Worker<AuthEmailJobData> | null = null;
let mailTransporter: Transporter | null = null;

/**
 * Returns or initializes the Nodemailer transport instance.
 *
 * @returns {Transporter} The initialized mail transporter
 */
export const getMailTransporter = (): Transporter => {
  if (mailTransporter) {
    return mailTransporter;
  }

  const host = getEnvValue("SMTP_HOST");
  const port = getEnvValue("SMTP_PORT");
  const user = getEnvValue("SMTP_USER");
  const pass = getEnvValue("SMTP_PASSWORD");

  const isSecure = port === 465;

  mailTransporter = nodemailer.createTransport({
    host,
    port,
    auth: { user, pass },
    secure: isSecure,
    requireTLS: !isSecure,
  });

  return mailTransporter;
};

/**
 * Processes an individual authentication email job from the BullMQ queue.
 *
 * @param job - The active email delivery job
 * @returns A promise resolving to the Nodemailer send response
 */
export const processAuthEmailJob = async (
  job: Job<AuthEmailJobData>,
): Promise<SentMessageInfo> => {
  const { to, code, flowType, approximateLocation, expirationMinutes, lang } =
    job.data;

  const isEs = lang === "es";
  const isLogin = flowType === "login";

  const subject = isLogin
    ? isEs
      ? "Tu código de inicio de sesión - Utilities"
      : "Your Login Verification Code - Utilities"
    : isEs
      ? "Tu código de registro - Utilities"
      : "Your Sign-in Verification Code - Utilities";

  const emailElement = React.createElement(AuthEmail, {
    code,
    flowType,
    approximateLocation,
    expirationMinutes,
    lang,
  });

  const html = await render(emailElement);

  const transporter = getMailTransporter();
  const fromAddress = getEnvValue("SMTP_USER");

  const result = await transporter.sendMail({
    from: `"Utilities Security" <${fromAddress}>`,
    to,
    subject,
    html,
    text: `${subject}: ${code}. Expires in ${expirationMinutes} minutes. Location: ${approximateLocation}`,
  });

  return result;
};

/**
 * Starts the BullMQ worker for processing authentication emails.
 *
 * @returns {Worker<AuthEmailJobData>} The active BullMQ worker instance
 */
export const startAuthEmailWorker = (): Worker<AuthEmailJobData> => {
  if (authEmailWorker) {
    return authEmailWorker;
  }

  const redisConnection = getRedisClient();

  authEmailWorker = new Worker<AuthEmailJobData>(
    QUEUE_NAME,
    processAuthEmailJob,
    {
      connection: redisConnection,
      concurrency: 5,
    },
  );

  authEmailWorker.on("completed", (job) => {
    Logger.log(
      chalk.green(
        `Authentication email successfully delivered to recipient (job id: ${job.id})`,
      ),
    );
  });

  authEmailWorker.on("failed", (job, error) => {
    Logger.error(
      chalk.red(`Authentication email delivery failed for job ${job?.id}:`),
      error,
    );
  });

  Logger.log(chalk.blue("BullMQ Auth Email Worker initialized and listening"));

  return authEmailWorker;
};

/**
 * Gracefully shuts down the authentication email worker.
 *
 * @returns A promise resolving when worker processing has ceased
 */
export const closeAuthEmailWorker = async (): Promise<void> => {
  if (authEmailWorker) {
    await authEmailWorker.close();
    authEmailWorker = null;
  }
};
