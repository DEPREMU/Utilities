import {
  WASocket,
  WAMessage,
  downloadContentFromMessage,
} from "@whiskeysockets/baileys";
import { Timers } from "@common";
import { processLocalSticker } from "./localWorker";
import { getPersonalStickerConfig } from "./personalConfig";

const processedMessageIds = new Set<string>();

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
  if (!key || key.fromMe || !key.remoteJid) return;

  if (key.id) {
    if (processedMessageIds.has(key.id)) return;

    processedMessageIds.add(key.id);
    Timers.setTimeout(() => {
      if (key.id) processedMessageIds.delete(key.id);
    }, 300000);
  }

  const config = getPersonalStickerConfig();
  if (!config.enabledAutoReply) return;

  const isGroup = key.remoteJid.endsWith("@g.us");
  if (isGroup && config.allowedChats !== "all") return;

  const msg = message.message;
  if (!msg) return;

  const imageMsg = msg.imageMessage;
  if (!imageMsg) return;

  try {
    const stream = await downloadContentFromMessage(imageMsg, "image");

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

    await sock.sendMessage(
      key.remoteJid,
      { sticker: result.buffer },
      { quoted: message },
    );
  } catch {
    return;
  }
};
