import {
  startAuthEmailWorker,
  closeAuthEmailWorker,
} from "./queue/authEmailWorker.ts";
import {
  Helper,
  Logger,
  REPLACERS,
  startMemoryMonitor,
  ThirdPartyStateManager,
} from "@common";
import {
  initWebSocket,
  initWebSocketCryptos,
  initWebSocketClipboard,
  initWebSocketLoginQRCode,
  initWebSocketServerLogs,
} from "./websocket/index.ts";
import path from "path";
import cors from "cors";
import http from "http";
import chalk from "chalk";
import helmet from "helmet";
import { URL } from "url";
import express from "express";
import routerAPI from "./routes/index.ts";
import rateLimit from "express-rate-limit";
import { config } from "./config.ts";
import compression from "compression";
import { handleInitDB } from "./database/postgres.ts";
import { closeAuthEmailQueue } from "./queue/authEmailQueue.ts";
import { initializeFirebaseAdmin } from "./firebase/admin.ts";
import { validateServerEnv, getEnvValue } from "./env.ts";
import { getRedisClient, closeRedisConnection } from "./redis/client.ts";
import { CryptosWebSocketMessage, WebSocketPathname } from "@types";

type ServerWebSocket = ReturnType<typeof initWebSocket>;

const app = express();

startMemoryMonitor();
validateServerEnv();

try {
  initializeFirebaseAdmin();
} catch (error) {
  Logger.error(chalk.red("Failed to initialize Firebase Admin SDK:"), error);
}

const sourceProtocol = getEnvValue("USE_HTTPS") ? "https" : "http";
const sourceProtocolWs = getEnvValue("USE_HTTPS") ? "wss" : "ws";

const startApp = async () => {
  if (!REPLACERS.isDev) {
    const helmetMiddleware = helmet({
      contentSecurityPolicy: {
        directives: {
          defaultSrc: ["'self'"],
          scriptSrc: ["'self'"],
          styleSrc: ["'self'", `${sourceProtocol}:`],
          imgSrc: ["'self'", "data:", `${sourceProtocol}:`],
          connectSrc: ["'self'"],
          fontSrc: ["'self'", `${sourceProtocol}:`],
          objectSrc: ["'none'"],
          upgradeInsecureRequests: [],
        },
      },
      crossOriginEmbedderPolicy: false,
    }) as unknown as express.RequestHandler;
    app.use(helmetMiddleware);
    app.set("trust proxy", 1);
  } else {
    app.get("/", (_, res) => {
      res.redirect(301, "/updates");
    });
  }
  app.use(cors());
  app.use(compression({ threshold: 0 }));
  app.use(
    "/api",
    express.json({ limit: "50mb" }),
    rateLimit({
      limit: !REPLACERS.isDev ? 200 : Infinity,
      windowMs: 1 * 60 * 1000,
    }),
    routerAPI,
  );

  app.use(express.static(config.getRoutes("WEB_PATH_UPDATES")));
  app.get(/.*/, (_, res) => {
    res.sendFile(path.join(config.getRoutes("WEB_PATH_UPDATES"), "index.html"));
  });

  const server = http.createServer(app);
  const webSockets: Record<WebSocketPathname, ServerWebSocket> = {
    "/ws": initWebSocket(),
    "/ws-logs": initWebSocketServerLogs(),
    "/clipboard": initWebSocketClipboard(),
    "/ws-cryptos": initWebSocketCryptos(),
    "/ws-login-qr": initWebSocketLoginQRCode(),
  };

  server.on("upgrade", (request, socket, head) => {
    if (!request.url) {
      Logger.error("Missing request URL");
      socket.destroy();
      return;
    }

    const pathname = new URL(
      request.url,
      `${sourceProtocol}://${request.headers.host}`,
    ).pathname as WebSocketPathname;

    const wsCalled = webSockets[pathname];

    if (!wsCalled) {
      Logger.error("WebSocket server not found for pathname:", pathname);
      socket.destroy();
      return;
    }

    if (
      pathname === "/ws-cryptos" &&
      !ThirdPartyStateManager.isAvailable("cryptos")
    ) {
      wsCalled.handleUpgrade(request, socket, head, (ws) => {
        Logger.error(
          "WebSocket connection rejected for /ws-cryptos due to unavailable dependency",
        );
        ws.send(
          JSON.stringify({
            type: "error",
            error: "service_unavailable",
          } satisfies CryptosWebSocketMessage<"sentByServer">),
        );
        ws.close(1011, "Service Unavailable");
      });
      return;
    }

    wsCalled.handleUpgrade(request, socket, head, (ws) => {
      Logger.log(
        chalk.blue("WebSocket connection upgraded for pathname:", pathname),
      );
      wsCalled.emit("connection", ws, request);
    });
  });

  await handleInitDB();

  try {
    getRedisClient();
    startAuthEmailWorker();
  } catch (error) {
    Logger.error(
      chalk.red("Failed to initialize Redis or BullMQ worker:"),
      error,
    );
  }

  const gracefulShutdown = async () => {
    Logger.log("Shutting down server services...");
    await closeAuthEmailWorker();
    await closeAuthEmailQueue();
    await closeRedisConnection();
    process.exit(0);
  };

  process.on("SIGTERM", gracefulShutdown);
  process.on("SIGINT", gracefulShutdown);

  server.listen(config.port, config.host, async () => {
    Logger.log(
      "\n",
      "\t" +
        chalk.green(
          `Server is running on ${sourceProtocol}://${config.host}:${config.port}`,
        ),
      "\n",
      ...Helper.Object.keys(webSockets).map((pathname) => {
        return (
          "\t" +
          chalk.green(
            `WebSocket is running on ${sourceProtocolWs}://${config.host}:${config.port}${pathname}`,
          ) +
          "\n"
        );
      }),
    );

    if (REPLACERS.isDev) await import("@/dev/index.ts");

    await config.executeFunctions();
  });
};

startApp();
