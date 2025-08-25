import cors from "cors";
import http from "http";
// import https from "https";
import express from "express";
import router from "./routes/index.ts";
import { host, port } from "./config.ts";
import { initWebSocket } from "./routes/WebSocket.ts";
import { validateServerEnv } from "./env.ts";

const app = express();

validateServerEnv();

app.use(express.json());
app.use(cors());
app.use("/api", router);

const server = http.createServer(app);
initWebSocket(server);

server.listen(port, host, () => {
  console.log(
    `Server is running on http://${host}:${port}`,
    "\n",
    `WebSocket is running on ws://${host}:${port}`,
  );
});
