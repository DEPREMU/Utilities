import chalk from "chalk";
import { Logger } from "@common";
import { prisma } from "@/database/postgres.ts";
import { LogsWebSocketMessage } from "@types";
import { WebSocket, WebSocketServer } from "ws";
import stripAnsi from "strip-ansi";

export const connectedLogClients = new Set<WebSocket>();

Logger.addInterceptor((type, message) => {
  const cleanedContent = stripAnsi(message);
  
  // Extract tag e.g. [auth] using regex
  const tagMatch = cleanedContent.match(/^\[(.*?)\]/);
  const tag = tagMatch ? tagMatch[1] : "untagged";

  // Enforce 10k limit and save to DB
  (async () => {
    try {
      const count = await prisma.serverLogs.count();
      if (count >= 10000) {
        // Delete oldest
        const oldest = await prisma.serverLogs.findMany({
          orderBy: { timestamp: "asc" },
          take: count - 9999,
          select: { id: true },
        });
        await prisma.serverLogs.deleteMany({
          where: { id: { in: oldest.map((o) => o.id) } },
        });
      }

      const log = await prisma.serverLogs.create({
        data: {
          type,
          originalContent: message,
          cleanedContent,
          tag,
        },
      });

      if (connectedLogClients.size > 0) {
        broadcastLogsMessage({
          type: "new_log",
          payload: {
            ...log,
            timestamp: log.timestamp.toISOString(),
          },
        });
      }
    } catch {
      // Ignore DB errors during logging
    }
  })();

  // Skip pino if clients are connected
  return connectedLogClients.size > 0;
});

const onMessage = async (
  buffer: WebSocket.RawData,
  _ws: WebSocket,
) => {
  try {
    const message = JSON.parse(
      buffer.toString(),
    ) as LogsWebSocketMessage<"sentByClient">;

    switch (message.type) {
      case "request_delete_log":
        await prisma.serverLogs.delete({
          where: { id: message.payload.id },
        }).catch(() => {});
        broadcastLogsMessage({
          type: "delete_log",
          payload: { id: message.payload.id },
        });
        break;

      case "request_delete_group":
        {
          const logs = await prisma.serverLogs.findMany({
            where: { cleanedContent: message.payload.cleanedContent },
            select: { id: true },
          });
          const ids = logs.map((l) => l.id);
          await prisma.serverLogs.deleteMany({
            where: { cleanedContent: message.payload.cleanedContent },
          }).catch(() => {});
          
          broadcastLogsMessage({
            type: "delete_bulk",
            payload: { ids },
          });
        }
        break;

      case "request_delete_all":
        await prisma.serverLogs.deleteMany().catch(() => {});
        broadcastLogsMessage({
          type: "delete_bulk",
          payload: {},
        });
        break;

      default:
        Logger.log(chalk.yellow("Unknown server logs message type:"), message);
        break;
    }
  } catch (error) {
    Logger.error(
      chalk.red("Error handling ServerLogs WebSocket message:"),
      error,
    );
  }
};

const onConnection = async (ws: WebSocket) => {
  connectedLogClients.add(ws);

  // Send initial sync
  try {
    const logs = await prisma.serverLogs.findMany({
      orderBy: { timestamp: "desc" },
      take: 10000,
    });
    
    const syncMsg: LogsWebSocketMessage<"sentByServer"> = {
      type: "sync_logs",
      payload: {
        logs: logs.map(l => ({
          ...l,
          timestamp: l.timestamp.toISOString(),
        })).reverse(), // Send oldest to newest
      },
    };
    ws.send(JSON.stringify(syncMsg));
  } catch (error) {
    Logger.error(chalk.red("Error sending initial logs sync:"), error);
  }

  ws.on("message", (buffer) => onMessage(buffer, ws));

  ws.on("close", () => {
    connectedLogClients.delete(ws);
  });

  ws.on("error", (error) => {
    Logger.error("ServerLogs WebSocket error:", error);
    connectedLogClients.delete(ws);
  });
};

export const broadcastLogsMessage = (message: LogsWebSocketMessage<"sentByServer">) => {
  const msgStr = JSON.stringify(message);
  for (const client of connectedLogClients) {
    if (client.readyState === WebSocket.OPEN) {
      try {
        client.send(msgStr);
      } catch {
        // Ignore
      }
    }
  }
};

export const initWebSocketServerLogs = () => {
  try {
    const wss = new WebSocketServer({ noServer: true });
    wss.on("connection", onConnection);
    return wss;
  } catch (error) {
    Logger.error(
      chalk.red("Error initializing ServerLogs WebSocket server:"),
      error instanceof Error ? error.message : error,
    );
    throw error;
  }
};
