import {
  startAuthEmailWorker,
  closeAuthEmailWorker,
} from "./queue/authEmailWorker";
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
  initWebSocketServerLogs,
  initWebSocketLoginQRCode,
} from "./websocket";
import path from "path";
import cors from "cors";
import http from "http";
import chalk from "chalk";
import helmet from "helmet";
import { URL } from "url";
import express from "express";
import routerAPI from "./routes";
import rateLimit from "express-rate-limit";
import compression from "compression";
import { getEnvValue } from "./env";
import { closeAuthEmailQueue } from "./queue/authEmailQueue";
import { handleInitDB, prisma } from "./database/postgres";
import { initializeFirebaseAdmin } from "./firebase/admin";
import { config, gracefullyShutdown } from "./config";
import { getRedisClient, closeRedisConnection } from "./redis/client";
import { initSharedGateway, closeSharedGateway } from "./whatsapp/gateway";
import { CryptosWebSocketMessage, WebSocketPathname } from "@types";

type ServerWebSocket = ReturnType<typeof initWebSocket>;

const logger = new Logger("Server");
const app = express();

startMemoryMonitor();

try {
  initializeFirebaseAdmin();
} catch (error) {
  logger.error(chalk.red("Failed to initialize Firebase Admin SDK:"), error);
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
      res.redirect(301, "/downloads");
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
      logger.error("Missing request URL");
      socket.destroy();
      return;
    }

    const pathname = new URL(
      request.url,
      `${sourceProtocol}://${request.headers.host}`,
    ).pathname as WebSocketPathname;

    const wsCalled = webSockets[pathname];

    if (!wsCalled) {
      logger.error("WebSocket server not found for pathname:", pathname);
      socket.destroy();
      return;
    }

    if (
      pathname === "/ws-cryptos" &&
      !ThirdPartyStateManager.isAvailable("cryptos")
    ) {
      wsCalled.handleUpgrade(request, socket, head, (ws) => {
        logger.error(
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
      logger.log(
        chalk.blue("WebSocket connection upgraded for pathname:", pathname),
      );
      wsCalled.emit("connection", ws, request);
    });
  });

  await handleInitDB();

  try {
    getRedisClient();
    startAuthEmailWorker();
    void initSharedGateway();
  } catch (error) {
    logger.error(
      chalk.red("Failed to initialize Redis or BullMQ worker:"),
      error,
    );
  }

  gracefullyShutdown.addFunction(
    () =>
      new Promise<void>((resolve) => {
        server.close(() => resolve());
      }),
    "HTTP/WebSocket Server Close",
    "HIGH",
  );

  gracefullyShutdown.addFunction(
    () => closeSharedGateway(),
    "WhatsApp Bot Gateway Close",
    "NORMAL",
  );

  gracefullyShutdown.addFunction(
    () => closeAuthEmailWorker(),
    "Auth Email Worker Close",
    "NORMAL",
  );

  gracefullyShutdown.addFunction(
    () => closeAuthEmailQueue(),
    "Auth Email Queue Close",
    "NORMAL",
  );

  gracefullyShutdown.addFunction(
    () => closeRedisConnection(),
    "Redis Connection Close",
    "LOW",
  );

  gracefullyShutdown.addFunction(
    () => prisma.$disconnect(),
    "Prisma Database Disconnect",
    "LOW",
  );

  server.listen(config.port, config.host, async () => {
    logger.log(
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

    if (REPLACERS.isDev) await import("@/dev");

    await config.executeFunctions();
  });
};

startApp();
