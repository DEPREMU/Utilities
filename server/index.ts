import "./dev/monitor.ts";
import "./database/initDB.ts";

import {
  initWebSocket,
  initWebSocketCryptos,
  initWebSocketClipboard,
  initWebSocketLoginQRCode,
} from "./websocket/index.ts";
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
import { showError, showInfo } from "./functions/logger.ts";
import { initializeFirebaseAdmin } from "./firebase/admin.ts";
import { validateServerEnv, getEnvValue } from "./env.ts";
import { executeFunctions, host, port, serverPath } from "./config.ts";
import { RequestAuth, RoutesAPI, WebSocketPathname } from "@types";

const app = express();

validateServerEnv();

try {
  initializeFirebaseAdmin();
} catch (error) {
  showError(chalk.red("Failed to initialize Firebase Admin SDK:"), error);
}

const sourceProtocol = getEnvValue("USE_HTTPS") ? "https" : "http";
const sourceProtocolWs = getEnvValue("USE_HTTPS") ? "wss" : "ws";

if (!getEnvValue("__DEV__")) {
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
    limit: !getEnvValue("__DEV__") ? 200 : Infinity,
  }),
  routerAPI,
);
app.use(
  "/updates",
  express.json(),
  express.static(path.join(serverPath, "updates", "web-page")),
  rateLimit({
    windowMs: 10 * 60 * 1000,
    limit: !getEnvValue("__DEV__") ? 200 : Infinity,
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
    showError("Missing request URL");
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
      showError("Invalid WebSocket pathname:", pathname);
      socket.destroy();
      return;
  }

  if (!wsCalled) {
    showError("WebSocket server not found for pathname:", pathname);
    socket.destroy();
    return;
  }

  wsCalled.handleUpgrade(request, socket, head, (ws) => {
    showInfo(
      chalk.blue("WebSocket connection upgraded for pathname:", pathname),
    );
    wsCalled.emit("connection", ws, request);
  });
});

handleInitDB().then(() => {
  server.listen(port, host, async () => {
    showInfo(
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
    if (getEnvValue("__DEV__")) {
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
          showInfo(chalk.blue("Test user signup response:"), data);
        })
        .catch((error) => {
          showError(chalk.red("Error during test user signup:"), error);
        });

      await runAllTests(true);
    }

    await executeFunctions();
  });
});
