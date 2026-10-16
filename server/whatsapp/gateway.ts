import {
  closeDeliveryQueue,
  startDeliveryWorker,
  closeDeliveryWorker,
  setDeliveryGatewaySender,
} from "./queues/deliveryQueue";
import {
  closeProcessQueue,
  startProcessWorker,
  closeProcessWorker,
  setProcessErrorSender,
} from "./queues/processQueue";
import {
  WASocket,
  Browsers,
  makeWASocket,
  DisconnectReason,
  useMultiFileAuthState,
  fetchLatestWaWebVersion,
} from "@whiskeysockets/baileys";
import pino from "pino";
import path from "path";
import chalk from "chalk";
import qrcode from "qrcode";
import { Directory, Logger, Timers } from "@common";
import { handleIncomingServerMessage } from "./messageHandler";
import { startHourlyTempCleanup, stopHourlyTempCleanup } from "./tempMedia";

const logger = new Logger("WhatsAppGateway");

export interface SharedGatewayStatus {
  connected: boolean;
  state: "open" | "close" | "connecting";
  uptimeSeconds: number;
  reconnectAttempts: number;
  qrDataUrl: string | null;
}

let sock: WASocket | null = null;
let connectionState: "open" | "close" | "connecting" = "close";
let connectedAt: number | null = null;
let reconnectAttempts = 0;
let reconnectTimer: number | null = null;
let qrDataUrl: string | null = null;
let serviceEnabled = true;
let isShuttingDown = false;

export const isServiceEnabled = (): boolean => serviceEnabled;

export const setServiceEnabled = (enabled: boolean): void => {
  serviceEnabled = enabled;
  logger.log(
    chalk.yellow(`WhatsApp bot serviceEnabled toggled to: ${serviceEnabled}`),
  );
};

export const isSharedGatewayConnected = (): boolean =>
  connectionState === "open";

export const getSharedGatewayStatus = (): SharedGatewayStatus => ({
  connected: connectionState === "open",
  state: connectionState,
  uptimeSeconds: connectedAt
    ? Math.floor((Date.now() - connectedAt) / 1000)
    : 0,
  reconnectAttempts,
  qrDataUrl,
});

export const getSharedSocket = (): WASocket | null => sock;

export const sendSticker = async (
  recipientId: string,
  stickerBuffer: Buffer,
  quotedMessageId?: string,
): Promise<boolean> => {
  if (!sock || connectionState !== "open") return false;

  const sendOptions = quotedMessageId
    ? {
        quoted: {
          key: { id: quotedMessageId, remoteJid: recipientId, fromMe: false },
          message: { conversation: "" },
        },
      }
    : undefined;

  try {
    await sock.sendMessage(
      recipientId,
      { sticker: stickerBuffer },
      sendOptions,
    );
    return true;
  } catch (error) {
    if (sendOptions) {
      try {
        await sock.sendMessage(recipientId, { sticker: stickerBuffer });
        return true;
      } catch (fallbackError) {
        logger.error(
          chalk.red(`Failed to send sticker (fallback) to ${recipientId}:`),
          fallbackError,
        );
        return false;
      }
    }
    logger.error(chalk.red(`Failed to send sticker to ${recipientId}:`), error);
    return false;
  }
};

export const sendTextMessage = async (
  recipientId: string,
  text: string,
  quotedMessageId?: string,
): Promise<boolean> => {
  if (!sock || connectionState !== "open") {
    return false;
  }

  const sendOptions = quotedMessageId
    ? {
        quoted: {
          key: { id: quotedMessageId, remoteJid: recipientId, fromMe: false },
          message: { conversation: "" },
        },
      }
    : undefined;

  try {
    await sock.sendMessage(recipientId, { text }, sendOptions);
    return true;
  } catch (error) {
    if (sendOptions) {
      try {
        await sock.sendMessage(recipientId, { text });
        return true;
      } catch (fallbackError) {
        logger.error(
          chalk.red(`Failed to send text (fallback) to ${recipientId}:`),
          fallbackError,
        );
        return false;
      }
    }
    logger.error(
      chalk.red(`Failed to send text message to ${recipientId}:`),
      error,
    );
    return false;
  }
};

export const initSharedGateway = async (): Promise<void> => {
  if (isShuttingDown) return;
  if (reconnectTimer) {
    Timers.clearTimeout(reconnectTimer);
    reconnectTimer = null;
  }

  connectionState = "connecting";

  const sessionDir = path.resolve(
    process.cwd(),
    ".temp/whatsapp-shared-session",
  );
  await new Directory(sessionDir).mkdir({ recursive: true });

  // eslint-disable-next-line react-hooks/rules-of-hooks
  const { state, saveCreds } = await useMultiFileAuthState(sessionDir);

  let version: [number, number, number] | undefined;
  try {
    const latest = await fetchLatestWaWebVersion();
    version = latest.version;
  } catch {
    version = [2, 3000, 1050532919];
  }

  sock = makeWASocket({
    version,
    auth: state,
    logger: pino({ level: "silent" }),
    browser: Browsers.windows("Chrome"),
    printQRInTerminal: false,
  });

  setDeliveryGatewaySender({
    sendSticker,
    isGatewayConnected: isSharedGatewayConnected,
  });
  setProcessErrorSender({
    sendTextMessage,
  });

  startDeliveryWorker();
  startProcessWorker();
  startHourlyTempCleanup();

  sock.ev.on("creds.update", saveCreds);

  sock.ev.on("connection.update", async (update) => {
    const { connection, lastDisconnect, qr } = update;

    if (qr) {
      try {
        qrDataUrl = await qrcode.toDataURL(qr);
        const terminalQr = await qrcode.toString(qr, {
          type: "terminal",
          small: true,
        });
        logger.log(
          chalk.cyan(
            "\n[WhatsApp Shared Bot] Scan this QR code in WhatsApp (Linked Devices) to connect:\n",
          ),
        );
        // eslint-disable-next-line no-console
        console.log("....\n\n", terminalQr, "\n\n....");
      } catch {
        qrDataUrl = null;
      }
    }

    if (connection === "open") {
      connectionState = "open";
      connectedAt = Date.now();
      reconnectAttempts = 0;
      qrDataUrl = null;
      logger.log(
        chalk.green("Shared WhatsApp Bot Gateway connected successfully"),
      );
    } else if (connection === "close") {
      connectionState = "close";
      connectedAt = null;

      const statusCode = (
        lastDisconnect?.error as { output?: { statusCode?: number } }
      )?.output?.statusCode;
      const shouldReconnect = statusCode !== DisconnectReason.loggedOut;

      logger.log(
        chalk.yellow(
          `Shared WhatsApp Bot Gateway connection closed (status: ${statusCode}). Reconnecting: ${shouldReconnect}`,
        ),
      );

      if (shouldReconnect && !isShuttingDown) {
        reconnectAttempts++;
        const delayMs = Math.min(30000, 1000 * Math.pow(2, reconnectAttempts));
        reconnectTimer = Timers.setTimeout(() => {
          void initSharedGateway();
        }, delayMs);
      }
    }
  });

  sock.ev.on("messages.upsert", async (upsert) => {
    if (sock) {
      await handleIncomingServerMessage(upsert, sock);
    }
  });
};

export const closeSharedGateway = async (): Promise<void> => {
  isShuttingDown = true;
  if (reconnectTimer) {
    Timers.clearTimeout(reconnectTimer);
    reconnectTimer = null;
  }

  stopHourlyTempCleanup();
  await closeDeliveryWorker();
  await closeDeliveryQueue();
  await closeProcessWorker();
  await closeProcessQueue();

  if (sock) {
    try {
      sock.end(undefined);
    } catch {
      return;
    }
    sock = null;
  }

  connectionState = "close";
  connectedAt = null;
  logger.log(chalk.gray("Shared WhatsApp Bot Gateway shut down cleanly"));
};
