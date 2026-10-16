import {
  WASocket,
  WAMessage,
  downloadContentFromMessage,
} from "@whiskeysockets/baileys";
import chalk from "chalk";
import { prisma } from "@/database/postgres";
import { saveTempMedia } from "./tempMedia";
import { Logger, Timers } from "@common";
import { isServiceEnabled } from "./gateway";
import { handleLinkCommand } from "./commands/linkCommand";
import { validateImagePayload } from "@commonSrc/serverOrElectron/whatsapp/validator";
import { enqueueWhatsAppProcessJob } from "./queues/processQueue";
import { getLinkedAccountByWhatsAppId } from "./linkManager";
import { getUtcDateKey, checkRateLimit } from "./rateLimiter";
import { detectLanguageFromJid, getBotMessage } from "./language";
import { enforceWhatsAppQuota, notifyUserQuotaUpdate } from "./quotaMiddleware";

const logger = new Logger("WhatsAppMessageHandler");

const processedMessageIds = new Set<string>();

const isMatchingPhone = (phoneA: string, phoneB: string): boolean => {
  if (!phoneA || !phoneB) return false;
  if (phoneA === phoneB) return true;
  const normalizedA = phoneA.startsWith("521")
    ? `52${phoneA.slice(3)}`
    : phoneA;
  const normalizedB = phoneB.startsWith("521")
    ? `52${phoneB.slice(3)}`
    : phoneB;
  return normalizedA === normalizedB;
};

/**
 * Sends a reply message back to the sender with an unquoted fallback.
 *
 * @param sock - Active Baileys socket
 * @param jid - Recipient WhatsApp JID
 * @param text - Message text to send
 * @param quoted - Optional original message to quote
 */
const replyToSender = async (
  sock: WASocket,
  jid: string,
  text: string,
  quoted?: WAMessage,
): Promise<void> => {
  try {
    await sock.sendMessage(jid, { text }, quoted ? { quoted } : undefined);
  } catch {
    try {
      await sock.sendMessage(jid, { text });
    } catch {
      return;
    }
  }
};

/**
 * Handles incoming WhatsApp messages received by the shared server bot.
 *
 * @param upsert - Baileys message upsert payload
 * @param sock - Active Baileys socket
 */
export const handleIncomingServerMessage = async (
  upsert: { messages: WAMessage[] },
  sock: WASocket,
): Promise<void> => {
  for (const message of upsert.messages) {
    const key = message.key;
    if (!key || !key.remoteJid || key.remoteJid === "status@broadcast")
      continue;

    const myUser = sock.user;
    const myPhone = myUser?.id
      ? myUser.id.split(":")[0].split("@")[0].replace(/\D/g, "")
      : "";
    const myLid = myUser?.lid
      ? myUser.lid.split(":")[0].split("@")[0].replace(/\D/g, "")
      : "";
    const remoteDigits = key.remoteJid
      .split(":")[0]
      .split("@")[0]
      .replace(/\D/g, "");

    const isSelfChat =
      isMatchingPhone(myPhone, remoteDigits) ||
      Boolean(
        myLid && (remoteDigits === myLid || key.remoteJid.startsWith(myLid)),
      );

    if (key.fromMe && !isSelfChat) continue;

    if (key.remoteJid.endsWith("@g.us")) continue;

    const messageId = key.id || `${Date.now()}`;
    if (processedMessageIds.has(messageId)) continue;
    processedMessageIds.add(messageId);
    Timers.setTimeout(
      () => {
        processedMessageIds.delete(messageId);
      },
      5 * 60 * 1000,
    );

    const senderJid = key.remoteJid;
    const lang = detectLanguageFromJid(senderJid);

    if (!isServiceEnabled()) {
      const maintenanceText = getBotMessage("maintenanceNotice", lang);
      await replyToSender(sock, senderJid, maintenanceText, message);
      continue;
    }

    const msg = message.message;
    if (!msg) continue;

    const textContent = msg.conversation || msg.extendedTextMessage?.text || "";

    if (textContent.trim().toLowerCase().startsWith("/link")) {
      const linkMatch = textContent
        .trim()
        .match(/^\/link\s+([A-Za-z0-9]{6})$/i);
      if (linkMatch) {
        await handleLinkCommand(
          senderJid,
          linkMatch[1].toUpperCase(),
          lang,
          sock,
          message,
        );
        continue;
      }
    }

    const imageMsg = msg.imageMessage;
    const videoMsg = msg.videoMessage;
    const documentMsg = msg.documentMessage;

    let mediaType: "image" | "video" | "document" | null = null;
    let targetMsg: typeof imageMsg | typeof videoMsg | typeof documentMsg =
      null;

    if (imageMsg) {
      mediaType = "image";
      targetMsg = imageMsg;
    } else if (
      videoMsg &&
      (videoMsg.gifPlayback || videoMsg.mimetype === "image/gif")
    ) {
      mediaType = "video";
      targetMsg = videoMsg;
    } else if (
      documentMsg &&
      documentMsg.mimetype &&
      (documentMsg.mimetype === "image/gif" ||
        documentMsg.mimetype.startsWith("image/"))
    ) {
      mediaType = "document";
      targetMsg = documentMsg;
    }

    if (!mediaType || !targetMsg) {
      continue;
    }

    const isUnderRateLimit = await checkRateLimit(senderJid);
    if (!isUnderRateLimit) {
      const rateText = getBotMessage("rateLimitExceeded", lang);
      await replyToSender(sock, senderJid, rateText, message);
      continue;
    }

    const linked = await getLinkedAccountByWhatsAppId(senderJid);
    const identifier = linked ? linked.userId : senderJid;

    const quotaResult = await enforceWhatsAppQuota(senderJid);
    if (!quotaResult.allowed) {
      const quotaText =
        quotaResult.rejectionMessage || getBotMessage("quotaExceeded", lang);
      await replyToSender(sock, senderJid, quotaText, message);
      continue;
    }

    if (linked) {
      void notifyUserQuotaUpdate(linked.userId);
    }

    const dateKey = getUtcDateKey();
    void prisma.whatsAppUsage
      .upsert({
        where: {
          identifier_date: {
            identifier,
            date: dateKey,
          },
        },
        update: {
          consumedCount: { increment: 1 },
          lastRequestAt: new Date(),
          userId: linked ? linked.userId : undefined,
        },
        create: {
          identifier,
          date: dateKey,
          consumedCount: 1,
          lastRequestAt: new Date(),
          userId: linked ? linked.userId : undefined,
        },
      })
      .catch(() => {});

    try {
      const stream = await downloadContentFromMessage(targetMsg, mediaType);
      const chunks: Buffer[] = [];
      for await (const chunk of stream) {
        chunks.push(chunk);
      }
      const inputBuffer = Buffer.concat(chunks);

      const validation = await validateImagePayload(inputBuffer);
      if (!validation.valid) {
        const errorKey =
          validation.error === "unsupportedMedia"
            ? "unsupportedMedia"
            : "processingError";
        const errorText = getBotMessage(errorKey, lang);
        await replyToSender(sock, senderJid, errorText, message);
        continue;
      }

      const isAnimated = !!validation.isAnimated;
      const fileExt = isAnimated ? "gif" : validation.format || "png";
      const tempInputPath = await saveTempMedia(inputBuffer, fileExt);

      await enqueueWhatsAppProcessJob({
        jobId: `${Date.now()}-${messageId}`,
        messageId,
        senderId: senderJid,
        isLinked: !!linked,
        isAnimated,
        tempInputPath,
        lang,
        options: {
          packName: "Utilities",
          authorName: "Utilities Sticker Bot",
          emojis: ["✨"],
          quality: 80,
        },
        enqueuedAt: Date.now(),
      });
    } catch (error) {
      logger.error(
        chalk.red(`Failed to handle incoming media message ${messageId}:`),
        error,
      );
      const errorText = getBotMessage("processingError", lang);
      await replyToSender(sock, senderJid, errorText, message);
    }
  }
};
