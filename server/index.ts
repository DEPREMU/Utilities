import "./dev/monitor.ts";

import cors from "cors";
import http from "http";
// import https from "https";
import chalk from "chalk";
import router from "./routes/index.ts";
import { URL } from "url";
import express from "express";
import { host, port } from "./config.ts";
import { handleInitDB } from "./database/postgres.ts";
import { validateServerEnv } from "./env.ts";
import type { WebSocketPathname } from "../types/typesWebSocket.ts";
import { initializeFirebaseAdmin } from "./firebase/admin.ts";
import { initWebSocket, initWebSocketClipboard } from "./routes/WebSocket.ts";

const app = express();

validateServerEnv();

try {
  initializeFirebaseAdmin();
} catch (error) {
  console.error(chalk.red("Failed to initialize Firebase Admin SDK:"), error);
}

app.use(express.json());
app.use(cors());
app.use("/api", router);

const server = http.createServer(app);
const generalWss = initWebSocket();
const clipboardWss = initWebSocketClipboard();

server.on("upgrade", (request, socket, head) => {
  if (!request.url) {
    console.error("Missing request URL");
    socket.destroy();
    return;
  }

  const pathname = new URL(request.url, `http://${request.headers.host}`)
    .pathname as WebSocketPathname;

  if (pathname === "/clipboard") {
    clipboardWss.handleUpgrade(request, socket, head, (ws) => {
      clipboardWss.emit("connection", ws, request);
    });
  } else if (pathname === "/ws") {
    generalWss.handleUpgrade(request, socket, head, (ws) => {
      generalWss.emit("connection", ws, request);
    });
  } else socket.destroy();
});

handleInitDB().then(() => {
  server.listen(port, host, () => {
    console.log(
      "",
      chalk.green(`Server is running on http://${host}:${port}`),
      "\n",
      chalk.green(`WebSocket is running on ws://${host}:${port}/ws`),
      "\n",
      chalk.green(
        `Clipboard WebSocket is running on ws://${host}:${port}/clipboard`,
      ),
    );
  });
});
