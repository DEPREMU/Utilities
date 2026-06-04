import "./database/initDB.ts";

import {
  initWebSocket,
  initWebSocketCryptos,
  initWebSocketClipboard,
  initWebSocketLoginQRCode,
} from "./websocket/index.ts";
import {
  host,
  port,
  REPLACERS,
  serverPath,
  executeFunctions,
} from "./config.ts";
import cors from "cors";
import path from "path";
import http from "http";
import chalk from "chalk";
import helmet from "helmet";
import { URL } from "url";
import express from "express";
import routerAPI from "./routes/index.ts";
import rateLimit from "express-rate-limit";
import compression from "compression";
import routerUpdates from "./updates/index.ts";
import { runAllTests } from "./testingRoutes/index.ts";
import { handleInitDB } from "./database/postgres.ts";
import { deleteInTable } from "./database/functions.ts";
import { initializeFirebaseAdmin } from "./firebase/admin.ts";
import { Logger, startMemoryMonitor } from "@common";
import { validateServerEnv, getEnvValue } from "./env.ts";

import { RequestAuth, RoutesAPI, WebSocketPathname } from "@types";

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

if (!REPLACERS.isDev) {
  app.use(
    helmet({
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
    }),
  );
  app.set("trust proxy", 1);
}
app.use(cors());
app.use(compression({ threshold: 0 }));
app.use(
  "/api",
  express.json({ limit: "50mb" }),
  rateLimit({
    windowMs: 1 * 60 * 1000,
    limit: !REPLACERS.isDev ? 200 : Infinity,
  }),
  routerAPI,
);
app.use(
  "/updates",
  express.json(),
  express.static(path.join(serverPath, "updates", "web-page")),
  rateLimit({
    windowMs: 10 * 60 * 1000,
    limit: !REPLACERS.isDev ? 200 : Infinity,
  }),
  routerUpdates,
);

const server = http.createServer(app);
const cryptoWss = initWebSocketCryptos();
const generalWss = initWebSocket();
const clipboardWss = initWebSocketClipboard();
const webSocketLoginQRCode = initWebSocketLoginQRCode();

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

  wsCalled.handleUpgrade(request, socket, head, (ws) => {
    Logger.log(
      chalk.blue("WebSocket connection upgraded for pathname:", pathname),
    );
    wsCalled.emit("connection", ws, request);
  });
});

handleInitDB().then(() => {
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
    );
    if (REPLACERS.isDev) {
      const user: RequestAuth<"signup"> = {
        lang: "en",
        email: "test@test.test",
        password: "Test123!",
      };
      await deleteInTable("", "Users", {
        email: user.email,
      });

      const route: RoutesAPI = "/auth/signup";
      await fetch(`http://${host}:${port}/api${route}`, {
        body: JSON.stringify(user),
        method: "POST",
        headers: { "Content-Type": "application/json" },
      })
        .then((res) => res.json())
        .then((data) => {
          Logger.log(chalk.blue("Test user signup response:"), data);
        })
        .catch((error) => {
          Logger.error(chalk.red("Error during test user signup:"), error);
        });

      await runAllTests(true);
    }

    await executeFunctions();
  });
});
