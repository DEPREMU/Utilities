import chalk from "chalk";
import crypto from "crypto";
import { Logger } from "@common";
import { prisma } from "@/database/postgres";
import { WhatsAppLinkTokenResult } from "@types";

const logger = new Logger("WhatsAppLinkManager");

const TOKEN_EXPIRATION_SECONDS = 600;

/**
 * Generates an active 6-character linking code for a user account.
 *
 * @param userId - Unique identifier of the user account
 * @returns Promise resolving to WhatsAppLinkTokenResult
 */
export const generateLinkToken = async (
  userId: string,
): Promise<WhatsAppLinkTokenResult> => {
  const existingLink = await prisma.whatsAppAccountLink.findFirst({
    where: { userId },
  });

  if (existingLink) {
    throw new Error("User already has an active linked WhatsApp phone number.");
  }

  await prisma.whatsAppLinkToken.deleteMany({
    where: { userId, usedAt: null },
  });

  const code = crypto.randomBytes(3).toString("hex").toUpperCase();
  const expiresAt = new Date(Date.now() + TOKEN_EXPIRATION_SECONDS * 1000);

  await prisma.whatsAppLinkToken.create({
    data: {
      userId,
      code,
      expiresAt,
    },
  });

  logger.log(
    chalk.cyan(`Generated WhatsApp link code ${code} for user ${userId}`),
  );

  return {
    code,
    expiresAt: expiresAt.toISOString(),
    expiresInSeconds: TOKEN_EXPIRATION_SECONDS,
    instructions: {
      en: `Send '/link ${code}' to the Utilities WhatsApp bot to link your account.`,
      es: `Envía '/link ${code}' al bot de WhatsApp de Utilities para vincular tu cuenta.`,
    },
  };
};

/**
 * Redeems an unexpired linking token and associates the WhatsApp phone with the user.
 *
 * @param code - 6-character linking code
 * @param whatsappId - WhatsApp contact identifier
 * @param phoneNumber - Formatted telephone number
 * @returns Promise resolving to redemption outcome
 */
export const redeemLinkToken = async (
  code: string,
  whatsappId: string,
  phoneNumber: string,
): Promise<{ success: boolean; userId?: string; error?: string }> => {
  const normalizedCode = code.trim().toUpperCase();

  const token = await prisma.whatsAppLinkToken.findFirst({
    where: {
      code: normalizedCode,
      usedAt: null,
      expiresAt: { gt: new Date() },
    },
  });

  if (!token) {
    return { success: false, error: "invalid_or_expired" };
  }

  await prisma.$transaction(async (tx) => {
    await tx.whatsAppLinkToken.update({
      where: { id: token.id },
      data: { usedAt: new Date() },
    });

    await tx.whatsAppAccountLink.upsert({
      where: { whatsappId },
      update: {
        userId: token.userId,
        phoneNumber,
        verifiedAt: new Date(),
      },
      create: {
        userId: token.userId,
        whatsappId,
        phoneNumber,
        verifiedAt: new Date(),
      },
    });
  });

  logger.log(
    chalk.green(
      `Linked WhatsApp contact ${whatsappId} to user ${token.userId} using code ${normalizedCode}`,
    ),
  );

  void import("./quotaMiddleware").then(({ notifyUserQuotaUpdate }) => {
    void notifyUserQuotaUpdate(token.userId);
  });

  return { success: true, userId: token.userId };
};

/**
 * Permanently removes all linked WhatsApp records for a given user.
 *
 * @param userId - Unique identifier of the user
 * @returns Promise resolving to true if any link was removed
 */
export const unlinkWhatsAppAccount = async (
  userId: string,
): Promise<boolean> => {
  const result = await prisma.whatsAppAccountLink.deleteMany({
    where: { userId },
  });
  logger.log(
    chalk.yellow(
      `Unlinked WhatsApp accounts for user ${userId} (deleted: ${result.count})`,
    ),
  );

  void import("./quotaMiddleware").then(({ notifyUserQuotaUpdate }) => {
    void notifyUserQuotaUpdate(userId);
  });

  return result.count > 0;
};

/**
 * Retrieves the account link for a specific WhatsApp JID.
 *
 * @param whatsappId - WhatsApp identifier
 * @returns Promise resolving to link record or null
 */
export const getLinkedAccountByWhatsAppId = async (whatsappId: string) => {
  return await prisma.whatsAppAccountLink.findUnique({
    where: { whatsappId },
  });
};

/**
 * Retrieves the account link for a specific application user ID.
 *
 * @param userId - Application user ID
 * @returns Promise resolving to link record or null
 */
export const getLinkedAccountByUserId = async (userId: string) => {
  return await prisma.whatsAppAccountLink.findFirst({
    where: { userId },
  });
};
