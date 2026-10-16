import { getBotMessage } from "../language";
import { redeemLinkToken } from "../linkManager";
import type { WAMessage, WASocket } from "@whiskeysockets/baileys";

/**
 * Parses and executes an inbound /link <code> command sent to the WhatsApp bot.
 *
 * @param senderJid - Remote WhatsApp JID of the sender
 * @param code - 6-character linking code supplied by the user
 * @param lang - Target language ('es' or 'en') for the bot response
 * @param sock - Active Baileys socket instance
 * @param quotedMessage - Optional message payload to quote in the reply
 * @returns Promise resolving to boolean indicating link success
 */
export const handleLinkCommand = async (
  senderJid: string,
  code: string,
  lang: "es" | "en",
  sock: WASocket,
  quotedMessage?: WAMessage,
): Promise<boolean> => {
  const digits = senderJid.split("@")[0].replace(/\D/g, "");
  const formattedPhone = `+${digits}`;

  const result = await redeemLinkToken(code, senderJid, formattedPhone);

  const replyKey = result.success ? "linkSuccess" : "linkInvalidOrExpired";
  const replyMessage = getBotMessage(replyKey, lang);

  try {
    await sock.sendMessage(
      senderJid,
      { text: replyMessage },
      quotedMessage ? { quoted: quotedMessage } : undefined,
    );
  } catch {
    try {
      await sock.sendMessage(senderJid, { text: replyMessage });
    } catch {
      return result.success;
    }
  }

  return result.success;
};
