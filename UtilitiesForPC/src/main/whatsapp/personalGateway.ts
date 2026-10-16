import makeWASocketImport, {
  WASocket,
  Browsers,
  ConnectionState,
  DisconnectReason,
  fetchLatestBaileysVersion,
  makeWASocket as makeWASocketNamed,
} from "@whiskeysockets/baileys";
import qrcode from "qrcode";
import dataApp from "../utils/vars/variables";
import { Helper } from "@common";
import { BrowserWindow } from "electron";
import { PersonalWhatsAppStatus } from "@types";
import { handlePersonalIncomingMessage } from "./personalMessageListener";
import { initPersonalAuthState, purgePersonalSession } from "./personalSession";

const makeWASocket =
  typeof makeWASocketNamed === "function"
    ? makeWASocketNamed
    : typeof makeWASocketImport === "function"
      ? makeWASocketImport
      : (makeWASocketImport as unknown as { default: typeof makeWASocketNamed })
          .default;

let activeSocket: WASocket | null = null;
let currentStatus: PersonalWhatsAppStatus = {
  state: "disconnected",
};
let isManualDisconnect = false;

/**
 * Broadcasts the current personal WhatsApp connection status to the renderer window.
 *
 * @param status - Updated connection status object
 */
export const broadcastStatus = (status: PersonalWhatsAppStatus): void => {
  currentStatus = { ...status };
  const mainWindow = dataApp.getValue("mainWindow") as BrowserWindow | null;
  if (!mainWindow || mainWindow.isDestroyed()) return;

  mainWindow.webContents.send(
    "whatsapp:personal:status-changed",
    currentStatus,
  );
};

/**
 * Returns the current personal WhatsApp connection status.
 *
 * @returns Current status snapshot
 */
export const getPersonalWhatsAppStatus = (): PersonalWhatsAppStatus => {
  return { ...currentStatus };
};

/**
 * Disconnects the active personal WhatsApp socket without purging saved credentials.
 *
 * @returns Promise resolving to true once closed
 */
export const disconnectPersonalWhatsApp = async (): Promise<boolean> => {
  isManualDisconnect = true;
  if (activeSocket) {
    const sock = activeSocket;
    activeSocket = null;
    try {
      sock.ev.removeAllListeners("connection.update");
      sock.ev.removeAllListeners("messages.upsert");
      sock.ev.removeAllListeners("creds.update");
      sock.ws?.close();
      sock.end(undefined);
    } catch {
      return true;
    }
  }

  broadcastStatus({ state: "disconnected" });
  return true;
};

/**
 * Disconnects the active socket and permanently removes local authentication credentials.
 *
 * @returns Promise resolving to true once purged
 */
export const logoutAndPurgePersonalWhatsApp = async (): Promise<boolean> => {
  isManualDisconnect = true;
  await disconnectPersonalWhatsApp();
  await purgePersonalSession();
  broadcastStatus({ state: "disconnected" });
  return true;
};

/**
 * Establishes or restores the personal WhatsApp connection.
 *
 * @returns Promise resolving to the initial connection status
 */
export const connectPersonalWhatsApp =
  async (): Promise<PersonalWhatsAppStatus> => {
    if (activeSocket && currentStatus.state === "connected") {
      return getPersonalWhatsAppStatus();
    }

    if (activeSocket) {
      const prevSock = activeSocket;
      activeSocket = null;
      try {
        prevSock.ev.removeAllListeners("connection.update");
        prevSock.ev.removeAllListeners("messages.upsert");
        prevSock.ev.removeAllListeners("creds.update");
        prevSock.ws?.close();
        prevSock.end(undefined);
      } catch {
        activeSocket = null;
      }
    }

    isManualDisconnect = false;
    broadcastStatus({ state: "connecting" });

    try {
      const { state, saveCreds } = await initPersonalAuthState();

      let version: [number, number, number] | undefined;
      try {
        const latest = await fetchLatestBaileysVersion();
        version = latest.version;
      } catch {
        version = [2, 3000, 1043857760];
      }

      const sock = makeWASocket({
        version,
        auth: state,
        printQRInTerminal: false,
        browser: Browsers.windows("Desktop"),
      });
      activeSocket = sock;

      sock.ev.on("creds.update", saveCreds);

      sock.ev.on(
        "connection.update",
        async (update: Partial<ConnectionState>) => {
          if (activeSocket !== sock || isManualDisconnect) return;
          const { connection, lastDisconnect, qr } = update;

          if (qr) {
            try {
              const qrDataUrl = await qrcode.toDataURL(qr);
              if (activeSocket === sock && !isManualDisconnect) {
                broadcastStatus({
                  state: "qr_ready",
                  qrDataUrl,
                });
              }
            } catch (err) {
              if (activeSocket === sock && !isManualDisconnect) {
                broadcastStatus({
                  state: "error",
                  errorMessage: String(err),
                });
              }
            }
          }

          if (connection === "close") {
            const statusCode = (
              lastDisconnect?.error as { output?: { statusCode?: number } }
            )?.output?.statusCode;
            const shouldReconnect =
              !isManualDisconnect &&
              activeSocket === sock &&
              statusCode !== DisconnectReason.loggedOut &&
              statusCode !== DisconnectReason.badSession;

            if (shouldReconnect) {
              broadcastStatus({ state: "connecting" });
              void connectPersonalWhatsApp();
            } else {
              if (isManualDisconnect) {
                broadcastStatus({ state: "disconnected" });
              } else {
                await logoutAndPurgePersonalWhatsApp();
              }
            }
          } else if (connection === "open") {
            const userJid = sock?.user?.id || "";
            const phoneNumber = userJid.split(":")[0] || userJid.split("@")[0];
            const realPhone = `+${phoneNumber}`;
            const name = sock?.user?.name || "Personal User";

            broadcastStatus({
              state: "connected",
              phoneNumber: Helper.secret(realPhone),
              name,
            });
          }
        },
      );

      sock.ev.on("messages.upsert", async ({ messages, type }) => {
        if (type !== "notify" || activeSocket !== sock) return;
        for (const msg of messages) {
          await handlePersonalIncomingMessage(sock, msg);
        }
      });

      return getPersonalWhatsAppStatus();
    } catch (error) {
      const errorStatus: PersonalWhatsAppStatus = {
        state: "error",
        errorMessage: error instanceof Error ? error.message : String(error),
      };
      broadcastStatus(errorStatus);
      return errorStatus;
    }
  };
