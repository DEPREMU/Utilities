import {
  WhatsAppQuotaUpdateMessage,
  WhatsAppGatewayStatusMessage,
} from "@types";
import chalk from "chalk";
import { Logger } from "@common";
import { WebSocket, WebSocketServer } from "ws";
import { getSharedGatewayStatus, isServiceEnabled } from "../whatsapp/gateway";

const logger = new Logger("WebSocketWhatsApp");

interface ConnectedClient {
  ws: WebSocket;
  userId?: string;
}

const connectedClients = new Set<ConnectedClient>();

export const broadcastWhatsAppGatewayStatus = (
  statusUpdate?: Partial<WhatsAppGatewayStatusMessage>,
): void => {
  const gateway = getSharedGatewayStatus();
  const message: WhatsAppGatewayStatusMessage = {
    type: "whatsapp-gateway-status",
    connected: statusUpdate?.connected ?? gateway.connected,
    serviceEnabled: statusUpdate?.serviceEnabled ?? isServiceEnabled(),
    maintenanceMessage: statusUpdate?.maintenanceMessage,
  };

  const payload = JSON.stringify(message);
  for (const client of connectedClients) {
    if (client.ws.readyState === WebSocket.OPEN) {
      client.ws.send(payload);
    }
  }
};

export const broadcastWhatsAppQuotaUpdate = (
  userId: string,
  quotaUpdate: Omit<WhatsAppQuotaUpdateMessage, "type">,
): void => {
  const message: WhatsAppQuotaUpdateMessage = {
    type: "whatsapp-quota-update",
    ...quotaUpdate,
  };

  const payload = JSON.stringify(message);
  for (const client of connectedClients) {
    if (client.userId === userId && client.ws.readyState === WebSocket.OPEN) {
      client.ws.send(payload);
    }
  }
};

export const initWebSocketWhatsApp = (wss: WebSocketServer): void => {
  wss.on("connection", (ws: WebSocket) => {
    const client: ConnectedClient = { ws };
    connectedClients.add(client);

    const gateway = getSharedGatewayStatus();
    const initialMessage: WhatsAppGatewayStatusMessage = {
      type: "whatsapp-gateway-status",
      connected: gateway.connected,
      serviceEnabled: isServiceEnabled(),
    };
    ws.send(JSON.stringify(initialMessage));

    ws.on("message", (raw: WebSocket.RawData) => {
      try {
        const data = JSON.parse(raw.toString()) as {
          type?: string;
          userId?: string;
        };
        if (data.type === "subscribe" && data.userId) {
          client.userId = data.userId;
        }
      } catch {
        // Discard malformed JSON
      }
    });

    ws.on("close", () => {
      connectedClients.delete(client);
    });

    ws.on("error", (error) => {
      logger.error(chalk.yellow("WebSocket error in WhatsApp channel:"), error);
      connectedClients.delete(client);
    });
  });

  logger.log(chalk.blue("WebSocket WhatsApp channel initialized"));
};
