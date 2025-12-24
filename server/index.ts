import "./dev/monitor.ts";
import "./database/initDB.ts";

import cors from "cors";
import http from "http";
// import https from "https";
import chalk from "chalk";
import helmet from "helmet";
import { URL } from "url";
import express from "express";
import routerAPI from "./routes/index.ts";
import rateLimit from "express-rate-limit";
import compression from "compression";
import routerUpdates from "./updates/index.ts";
import { host, port } from "./config.ts";
import { runAllTests } from "./testingRoutes/index.ts";
import { handleInitDB } from "./database/postgres.ts";
import { WebSocketPathname } from "@types";
import { showError, showInfo } from "./functions/logger.ts";
import env, { validateServerEnv } from "./env.ts";
import { initializeFirebaseAdmin } from "./firebase/admin.ts";
import { initWebSocketLoginQRCode } from "./websocket/WebSocketQRLogin.ts";
import { initWebSocket, initWebSocketClipboard } from "./websocket/index.ts";

const app = express();

validateServerEnv();

try {
  initializeFirebaseAdmin();
} catch (error) {
  showError(chalk.red("Failed to initialize Firebase Admin SDK:"), error);
}

const sourceProtocol = env.USE_HTTPS ? "https" : "http";

if (!env.__DEV__)
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
app.use(
  rateLimit({
    windowMs: 5 * 60 * 1000,
    limit: !env.__DEV__ ? 200 : Infinity,
  }),
);
app.use(cors());
app.use(compression({ threshold: 0 }));
app.use(express.json({ limit: "50mb" }));
app.use("/api", routerAPI);
app.use("/updates", routerUpdates);

const server = http.createServer(app);
const generalWss = initWebSocket();
const clipboardWss = initWebSocketClipboard();
const webSocketLoginQRCode = initWebSocketLoginQRCode();

server.on("upgrade", (request, socket, head) => {
  if (!request.url) {
    showError("Missing request URL");
    socket.destroy();
    return;
  }

  const pathname = new URL(request.url, `http://${request.headers.host}`)
    .pathname as WebSocketPathname;

  let wsCalled: typeof clipboardWss | null = null;

  switch (pathname) {
    case "/clipboard":
      wsCalled = clipboardWss;
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
  server.listen(port, host, () => {
    showInfo(
      "",
      chalk.green(`Server is running on http://${host}:${port}`),
      "\n",
      chalk.green(`WebSocket is running on ws://${host}:${port}/ws`),
      "\n",
      chalk.green(
        `Clipboard WebSocket is running on ws://${host}:${port}/clipboard`,
      ),
    );
    ["1", "true"].includes(env.__DEV__) && runAllTests(true);
  });
});
