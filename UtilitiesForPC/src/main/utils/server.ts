import cors from "cors";
import express from "express";
import { app } from "electron";
import dataApp from "./variables";
import { exec } from "child_process";
import machineId from "node-machine-id";
import { Server } from "http";
import { Logger } from "./logger";
import { ROUTER_IMAGES } from "@commonSrc/serverOrElectron/express/images";
import { AdvertisementTXT } from "@types";
import Bonjour, { ServiceConfig } from "bonjour-service";
import { Timers, stopMemoryMonitor } from "@common";
import { clearTempFiles, executeTerminalCommands } from "./storage";

let idTimeoutServer: NodeJS.Timeout | number | null = null;
let isReconnecting = false;
let isShuttingDown = false;

export const turnOffComputer = async (): Promise<boolean> => {
  Logger.warn("Received turn-off-computer request");
  const command = dataApp.getValue("isWindows")
    ? "shutdown /s /f /t 10"
    : "sudo shutdown -h now";

  return await new Promise((resolve) => {
    exec(command, (error, stdout, stderr) => {
      if (error) {
        const message = `Error shutting down the computer: ${error.message}`;
        Logger.error(message);
        resolve(false);
      }
      if (stdout) Logger.log(`Shutdown stdout: ${stdout}`);
      if (stderr) Logger.warn(`Shutdown stderr: ${stderr}`);
      resolve(true);
    });
  });
};

export const restartComputer = async (): Promise<boolean> => {
  Logger.warn("Received restart-computer request");
  const command = dataApp.getValue("isWindows")
    ? "shutdown /r /f /t 10"
    : "sudo shutdown -r now";

  return await new Promise((resolve) => {
    exec(command, (error, stdout, stderr) => {
      if (error) {
        const message = `Error restarting the computer: ${error.message}`;
        Logger.error(message);
        resolve(false);
      }
      if (stdout) Logger.log(`Restart stdout: ${stdout}`);
      if (stderr) Logger.warn(`Restart stderr: ${stderr}`);
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
    Logger.log(
      `Received deviceId: ${deviceId}, expected: ${dataApp.getValue(
        "deviceId",
      )} areEqual: ${deviceId === dataApp.getValue("deviceId")}`,
    );
    if (!deviceId || deviceId !== dataApp.getValue("deviceId")) {
      const message = "Unauthorized request: Invalid or missing deviceId";
      Logger.warn(message);
      res.status(401).json({ error: message });
      return;
    }
  } catch (error) {
    const message = `Error in permissions middleware: ${error}`;
    Logger.error(message);
    res.status(500).json({ error: message });
    return;
  }
  next();
};

export const handleShutdown = async () => {
  if (isShuttingDown) return;
  isShuttingDown = true;
  try {
    Logger.log("Executing shutdown commands...");
    await executeTerminalCommands("Shut-down");
  } catch (err) {
    Logger.error("Error executing shutdown commands:", err);
  }
  await clearTempFiles();
  Logger.log("Shutting down gracefully...");
  cleanAdAndServer();
  stopMemoryMonitor();
  Timers.setTimeout(() => process.exit(0), 500);
};

export const cleanAdAndServer = (): void => {
  const ad: Bonjour | null = dataApp.getValue("ad");
  const server: Server | null = dataApp.getValue("server");

  if (ad) {
    Logger.log("Stopping mDNS advertisement...");
    try {
      ad.unpublishAll();
      ad.destroy();
    } catch (e) {
      Logger.error("Error stopping ad (ignoring):", e);
    }
    dataApp.setValue("ad", null);
  }
  if (server) {
    Logger.log("Closing server...");
    try {
      server.close?.();
    } catch (e) {
      Logger.error("Error closing server (ignoring):", e);
    }
    dataApp.setValue("server", null);
  }
};

export const scheduleReconnect = (reason: string) => {
  if (isReconnecting || isShuttingDown) {
    Logger.log(
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
  Logger.warn(
    `Server stopped (${reason}). Reconnecting in ${delay / 1000}s...`,
  );

  if (idTimeoutServer) {
    clearTimeout(idTimeoutServer);
    idTimeoutServer = null;
  }

  idTimeoutServer = Timers.setTimeout(() => {
    Logger.log("Reconnect timeout elapsed. Attempting to restart...");
    idTimeoutServer = null;

    try {
      const server = dataApp.getValue("server");
      if (server) {
        server.close(() => {
          Logger.log("Existing server closed. Restarting...");
          initServer();
        });
      } else {
        Logger.log("No existing server found. Restarting...");
        initServer();
      }
    } catch (e) {
      Logger.error(
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
    Logger.warn("Shutdown in progress. Aborting server init.");
    return;
  }
  Logger.log("Initializing server...");

  if (!dataApp.getValue("hasSudo") && !dataApp.getValue("isWindows")) {
    Logger.error(
      "Permissions missing (no sudo or not Windows). Server will not start.",
    );
    return;
  }

  if (!dataApp.getValue("deviceId")) {
    machineId.machineId().then((id) => {
      dataApp.setValue("deviceId", id);
      Logger.log(`Device ID set: ${id}`);
    });
  }

  if (dataApp.getValue("hasSudo") && !dataApp.getValue("isWindows")) {
    Logger.log(`Configuring firewall...`);
    exec("sudo ufw allow 3005 && sudo ufw reload", (e) => {
      if (e) Logger.error(`Error configuring firewall: ${e.message}`);
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
          Logger.log(`Client log [${level}]: ${message}`);
          break;
        case "warn":
          Logger.warn(`Client log [${level}]: ${message}`);
          break;
        case "error":
          Logger.error(`Client log [${level}]: ${message}`);
          break;
        default:
          Logger.log(`Client log [${level}]: ${message}`);
      }

      res.json({ success: true });
    });

    app.post("/turn-off-computer", hasPermissionsMiddleware, async (_, res) => {
      Logger.log("Received /turn-off-computer request");
      res.json({ success: await turnOffComputer() });
    });

    app.post("/restart-computer", hasPermissionsMiddleware, async (_, res) => {
      Logger.log("Received /restart-computer request");
      res.json({ success: await restartComputer() });
    });

    app.use("/images", ROUTER_IMAGES);

    const server = app.listen(dataApp.getValue("PORT"), "0.0.0.0", () => {
      if (idTimeoutServer) {
        clearTimeout(idTimeoutServer);
        idTimeoutServer = null;
      }

      Logger.log(`Server listening on port ${dataApp.getValue("PORT")}`);

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
        Logger.error("Error setting up mDNS:", error);
      }
    });

    server.on("error", (err: NodeJS.ErrnoException) => {
      Logger.error(`Server error: ${err.message}`);
      if (err.code === "EADDRINUSE") {
        Logger.warn("Port 3005 already in use. Retrying...");
        scheduleReconnect("EADDRINUSE");
      } else {
        scheduleReconnect("server_error");
      }
    });

    server.on("close", () => {
      Logger.log("Server 'close' event fired.");
      dataApp.setValue("server", null);

      if (isReconnecting || isShuttingDown) {
        Logger.log("Server close was expected.");
      } else {
        Logger.warn("Server closed unexpectedly. Scheduling reconnect...");
        scheduleReconnect("unexpected_close");
      }
    });

    initDevServer();

    dataApp.setValue("server", server);
  } catch (error) {
    Logger.error("Fatal error during server initialization:", error);
    scheduleReconnect("init_catch");
  }
};

process.on("uncaughtException", (err) => {
  Logger.error("Uncaught exception:", err);
  scheduleReconnect("uncaughtException");
});

process.on("unhandledRejection", (reason) => {
  Logger.error("Unhandled promise rejection:", reason);
  scheduleReconnect("unhandledRejection");
});

process.on("SIGINT", handleShutdown); // Ctrl+C
process.on("SIGTERM", handleShutdown); // 'kill'
