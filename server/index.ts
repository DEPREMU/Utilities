import {
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
import cors from "cors";
import http from "http";
import chalk from "chalk";
import helmet from "helmet";
import { URL } from "url";
import express from "express";
import routerAPI from "./routes/index.ts";
import rateLimit from "express-rate-limit";
import compression from "compression";
import { handleInitDB } from "./database/postgres.ts";
import { initializeFirebaseAdmin } from "./firebase/admin.ts";
import { validateServerEnv, getEnvValue } from "./env.ts";
import { host, port, executeFunctions, getRoutes } from "./config.ts";
import { CryptosWebSocketMessage, WebSocketPathname } from "@types";

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
  app.use("/updates", express.static(getRoutes("WEB_PATH_UPDATES")));

  const server = http.createServer(app);
  const cryptoWss = initWebSocketCryptos();
  const generalWss = initWebSocket();
  const clipboardWss = initWebSocketClipboard();
  const webSocketLoginQRCode = initWebSocketLoginQRCode();
  const serverLogsWss = initWebSocketServerLogs();

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

    let wsCalled:
      | typeof cryptoWss
      | typeof generalWss
      | typeof clipboardWss
      | typeof webSocketLoginQRCode
      | typeof serverLogsWss
      | null = null;

    switch (pathname) {
      case "/clipboard":
        wsCalled = clipboardWss;
        break;
      case "/ws-cryptos":
        wsCalled = cryptoWss;
        break;
      case "/ws":
        wsCalled = generalWss;
        break;
      case "/ws-login-qr":
        wsCalled = webSocketLoginQRCode;
        break;
      case "/ws-logs":
        wsCalled = serverLogsWss;
        break;
      default:
        Logger.error("Invalid WebSocket pathname:", pathname);
        socket.destroy();
        return;
    }

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

  server.listen(port, host, async () => {
    Logger.log(
      "",
      chalk.green(`Server is running on ${sourceProtocol}://${host}:${port}`),
      "\n",
      chalk.green(
        `WebSocket is running on ${sourceProtocolWs}://${host}:${port}/ws`,
      ),
      "\n",
      chalk.green(
        `Clipboard WebSocket is running on ${sourceProtocolWs}://${host}:${port}/clipboard`,
      ),
      "\n",
      chalk.green(
        `Logs WebSocket is running on ${sourceProtocolWs}://${host}:${port}/ws-logs`,
      ),
    );

    if (REPLACERS.isDev) await import("@/dev/index.ts");

    await executeFunctions();
  });
};

startApp();
