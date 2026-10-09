import cors from "cors";
import express from "express";
import { app } from "electron";
import dataApp from "./vars/variables";
import { exec } from "child_process";
import machineId from "node-machine-id";
import { Server } from "http";
import { Logger } from "./logger";
import { ROUTER_IMAGES } from "@commonSrc/serverOrElectron/express/images";
import { AdvertisementTXT } from "@types";
import Bonjour, { ServiceConfig } from "bonjour-service";
import { Timers, stopMemoryMonitor } from "@common";
import { clearTempFiles, executeTerminalCommands } from "./storage";

const logger = new Logger("Server");

let idTimeoutServer: NodeJS.Timeout | number | null = null;
let isReconnecting = false;
let isShuttingDown = false;

export const turnOffComputer = async (): Promise<boolean> => {
  logger.warn("Received turn-off-computer request");
  const command = dataApp.getValue("isWindows")
    ? "shutdown /s /f /t 10"
    : "sudo shutdown -h now";

  return await new Promise((resolve) => {
    exec(command, (error, stdout, stderr) => {
      if (error) {
        const message = `Error shutting down the computer: ${error.message}`;
        logger.error(message);
        resolve(false);
      }
      if (stdout) logger.log(`Shutdown stdout: ${stdout}`);
      if (stderr) logger.warn(`Shutdown stderr: ${stderr}`);
      resolve(true);
    });
  });
};

export const restartComputer = async (): Promise<boolean> => {
  logger.warn("Received restart-computer request");
  const command = dataApp.getValue("isWindows")
    ? "shutdown /r /f /t 10"
    : "sudo shutdown -r now";

  return await new Promise((resolve) => {
    exec(command, (error, stdout, stderr) => {
      if (error) {
        const message = `Error restarting the computer: ${error.message}`;
        logger.error(message);
        resolve(false);
      }
      if (stdout) logger.log(`Restart stdout: ${stdout}`);
      if (stderr) logger.warn(`Restart stderr: ${stderr}`);
      resolve(true);
    });
  });
};

const hasPermissionsMiddleware = (
  req: express.Request,
  res: express.Response,
  next: express.NextFunction,
) => {
  try {
    const { deviceId } = req.body || {};
    logger.log(
      `Received deviceId: ${deviceId}, expected: ${dataApp.getValue(
        "deviceId",
      )} areEqual: ${deviceId === dataApp.getValue("deviceId")}`,
    );
    if (!deviceId || deviceId !== dataApp.getValue("deviceId")) {
      const message = "Unauthorized request: Invalid or missing deviceId";
      logger.warn(message);
      res.status(401).json({ error: message });
      return;
    }
  } catch (error) {
    const message = `Error in permissions middleware: ${error}`;
    logger.error(message);
    res.status(500).json({ error: message });
    return;
  }
  next();
};

export const handleShutdown = async () => {
  if (isShuttingDown) return;
  isShuttingDown = true;
  try {
    logger.log("Executing shutdown commands...");
    await executeTerminalCommands("Shut-down");
  } catch (err) {
    logger.error("Error executing shutdown commands:", err);
  }
  await clearTempFiles();
  logger.log("Shutting down gracefully...");
  cleanAdAndServer();
  stopMemoryMonitor();
  Timers.setTimeout(() => process.exit(0), 500);
};

export const cleanAdAndServer = (): void => {
  const ad: Bonjour | null = dataApp.getValue("ad");
  const server: Server | null = dataApp.getValue("server");

  if (ad) {
    logger.log("Stopping mDNS advertisement...");
    try {
      ad.unpublishAll();
      ad.destroy();
    } catch (e) {
      logger.error("Error stopping ad (ignoring):", e);
    }
    dataApp.setValue("ad", null);
  }
  if (server) {
    logger.log("Closing server...");
    try {
      server.close?.();
    } catch (e) {
      logger.error("Error closing server (ignoring):", e);
    }
    dataApp.setValue("server", null);
  }
};

export const scheduleReconnect = (reason: string) => {
  if (isReconnecting || isShuttingDown) {
    logger.log(
      `Reconnect ignored: (Reason: ${reason}, isReconnecting: ${isReconnecting}, isShuttingDown: ${isShuttingDown})`,
    );
    return;
  }
  isReconnecting = true;

  const delay = Math.min(
    5000 * Math.pow(2, dataApp.getValue("reconnectAttempts")),
    60000,
  );
  dataApp.setValue("reconnectAttempts", (prev) => prev + 1);
  logger.warn(
    `Server stopped (${reason}). Reconnecting in ${delay / 1000}s...`,
  );

  if (idTimeoutServer) {
    clearTimeout(idTimeoutServer);
    idTimeoutServer = null;
  }

  idTimeoutServer = Timers.setTimeout(() => {
    logger.log("Reconnect timeout elapsed. Attempting to restart...");
    idTimeoutServer = null;

    try {
      const server = dataApp.getValue("server");
      if (server) {
        server.close(() => {
          logger.log("Existing server closed. Restarting...");
          initServer();
        });
      } else {
        logger.log("No existing server found. Restarting...");
        initServer();
      }
    } catch (e) {
      logger.error(
        `Error during server close in reconnect: ${e instanceof Error ? e.message : String(e)}. Forcing restart.`,
      );
      initServer();
    }
  }, delay);
};

let serverDev: Server | null = null;

const initDevServer = (): void => {
  if (serverDev || app.isPackaged) return;

  const devApp = express();

  devApp.get("/close-app", (_, res) => {
    res.json({ success: true });

    Timers.setTimeout(handleShutdown, 1000);
    serverDev?.close();
  });

  serverDev = devApp.listen(9090, "localhost", (e) => {
    if (e) initDevServer();
  });
};

export const initServer = (): void => {
  if (isShuttingDown) {
    logger.warn("Shutdown in progress. Aborting server init.");
    return;
  }
  logger.log("Initializing server...");

  if (!dataApp.getValue("hasSudo") && !dataApp.getValue("isWindows")) {
    logger.error(
      "Permissions missing (no sudo or not Windows). Server will not start.",
    );
    return;
  }

  if (!dataApp.getValue("deviceId")) {
    machineId.machineId().then((id) => {
      dataApp.setValue("deviceId", id);
      logger.log(`Device ID set: ${id}`);
    });
  }

  if (dataApp.getValue("hasSudo") && !dataApp.getValue("isWindows")) {
    logger.log(`Configuring firewall...`);
    exec("sudo ufw allow 3005 && sudo ufw reload", (e) => {
      if (e) logger.error(`Error configuring firewall: ${e.message}`);
    });
  }

  try {
    cleanAdAndServer();

    const app = express();
    app.use(express.json({ limit: "1gb" }));
    app.use(cors());

    app.get("/status", (_, res) => {
      res.json({ success: true, message: "App is running" });
    });

    app.post("/log", (req, res) => {
      const { message, level } = req.body;

      switch (level || "log") {
        case "log":
          logger.log(`Client log [${level}]: ${message}`);
          break;
        case "warn":
          logger.warn(`Client log [${level}]: ${message}`);
          break;
        case "error":
          logger.error(`Client log [${level}]: ${message}`);
          break;
        default:
          logger.log(`Client log [${level}]: ${message}`);
      }

      res.json({ success: true });
    });

    app.post("/turn-off-computer", hasPermissionsMiddleware, async (_, res) => {
      logger.log("Received /turn-off-computer request");
      res.json({ success: await turnOffComputer() });
    });

    app.post("/restart-computer", hasPermissionsMiddleware, async (_, res) => {
      logger.log("Received /restart-computer request");
      res.json({ success: await restartComputer() });
    });

    app.use("/images", ROUTER_IMAGES);

    const server = app.listen(dataApp.getValue("PORT"), "0.0.0.0", () => {
      if (idTimeoutServer) {
        clearTimeout(idTimeoutServer);
        idTimeoutServer = null;
      }

      logger.log(`Server listening on port ${dataApp.getValue("PORT")}`);

      isReconnecting = false;
      dataApp.setValue("reconnectAttempts", 0);

      try {
        const lanIP = dataApp.getValue("lanIP");
        const deviceId = dataApp.getValue("deviceId");
        const txt: AdvertisementTXT = {
          lanIP,
          deviceId,
        };

        const serviceConfig: ServiceConfig = {
          txt,
          type: "http",
          port: dataApp.getValue("PORT"),
          name: lanIP.replace(/\./g, "-"),
          protocol: "tcp",
          disableIPv6: true,
        };

        const ad = new Bonjour({ type: "udp4" });
        const service = ad.publish(serviceConfig);

        dataApp.setValue("ad", ad);

        if (!service?.published && !service?.activated) initServer();
      } catch (error) {
        logger.error("Error setting up mDNS:", error);
      }
    });

    server.on("error", (err: NodeJS.ErrnoException) => {
      logger.error(`Server error: ${err.message}`);
      if (err.code === "EADDRINUSE") {
        logger.warn("Port 3005 already in use. Retrying...");
        scheduleReconnect("EADDRINUSE");
      } else {
        scheduleReconnect("server_error");
      }
    });

    server.on("close", () => {
      logger.log("Server 'close' event fired.");
      dataApp.setValue("server", null);

      if (isReconnecting || isShuttingDown) {
        logger.log("Server close was expected.");
      } else {
        logger.warn("Server closed unexpectedly. Scheduling reconnect...");
        scheduleReconnect("unexpected_close");
      }
    });

    initDevServer();

    dataApp.setValue("server", server);
  } catch (error) {
    logger.error("Fatal error during server initialization:", error);
    scheduleReconnect("init_catch");
  }
};

process.on("uncaughtException", (err) => {
  logger.error("Uncaught exception:", err);
  scheduleReconnect("uncaughtException");
});

process.on("unhandledRejection", (reason) => {
  logger.error("Unhandled promise rejection:", reason);
  scheduleReconnect("unhandledRejection");
});

process.on("SIGINT", handleShutdown); // Ctrl+C
process.on("SIGTERM", handleShutdown); // 'kill'
