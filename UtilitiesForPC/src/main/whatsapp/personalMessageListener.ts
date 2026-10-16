import {
  WASocket,
  WAMessage,
  downloadContentFromMessage,
} from "@whiskeysockets/baileys";
import { Timers } from "@common";
import { processLocalSticker } from "./localWorker";
import { getPersonalStickerConfig } from "./personalConfig";

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
 * Handles an incoming WhatsApp message received by the personal account.
 *
 * @param sock - Active Baileys WhatsApp socket
 * @param message - Inbound WhatsApp message payload
 * @returns Promise that resolves once evaluation and potential reply finish
 */
export const handlePersonalIncomingMessage = async (
  sock: WASocket,
  message: WAMessage,
): Promise<void> => {
  const key = message.key;
  if (!key || !key.remoteJid || key.remoteJid === "status@broadcast") return;

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

  if (key.fromMe && !isSelfChat) return;

  if (key.id) {
    if (processedMessageIds.has(key.id)) return;

    processedMessageIds.add(key.id);
    Timers.setTimeout(() => {
      if (key.id) processedMessageIds.delete(key.id);
    }, 300000);
  }

  const config = await getPersonalStickerConfig();
  if (!config.enabledAutoReply) return;

  const isGroup = key.remoteJid.endsWith("@g.us");
  if (isGroup && config.allowedChats !== "all") return;

  const msg = message.message;
  if (!msg) return;

  const imageMsg = msg.imageMessage;
  const videoMsg = msg.videoMessage;
  const documentMsg = msg.documentMessage;

  let mediaType: "image" | "video" | "document" | null = null;
  let targetMsg: typeof imageMsg | typeof videoMsg | typeof documentMsg = null;

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

  if (!mediaType || !targetMsg) return;

  try {
    const stream = await downloadContentFromMessage(targetMsg, mediaType);

    const chunks: Buffer[] = [];
    for await (const chunk of stream) chunks.push(chunk);

    const inputBuffer = Buffer.concat(chunks);

    const result = await processLocalSticker(inputBuffer, {
      emojis: config.emojis,
      quality: config.quality,
      packName: config.packName,
      authorName: config.authorName,
    });

    if (!result.success || !result.buffer) return;

    try {
      await sock.sendMessage(
        key.remoteJid,
        { sticker: result.buffer },
        { quoted: message },
      );
    } catch {
      await sock.sendMessage(key.remoteJid, { sticker: result.buffer });
    }
  } catch {
    return;
  }
};
