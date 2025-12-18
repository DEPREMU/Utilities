import cors from "cors";
import DNSSD from "dnssd";
import express from "express";
import dataApp from "./variables";
import machineId from "node-machine-id";
import { Server } from "http";
import { writeLog } from "./logger";
import { exec, execSync } from "child_process";
import { AdvertisementTXT } from "@types";
import { stopMemoryMonitor } from "./memoryMonitor";
import { handleChangeImageFormat } from "@common";
import { executeTerminalCommands } from "./storage";

if (!handleChangeImageFormat)
  throw new Error("handleChangeImageFormat is not defined");

let idTimeoutServer: NodeJS.Timeout | number | null = null;
let isReconnecting = false;
let isShuttingDown = false;

export const turnOffComputer = async (): Promise<boolean> => {
  writeLog("Received turn-off-computer request", "warn");
  const command = dataApp.getValue("isWindows")
    ? "shutdown /s /f /t 10"
    : "sudo shutdown -h now";

  return await new Promise((resolve) => {
    exec(command, (error, stdout, stderr) => {
      if (error) {
        const message = `Error shutting down the computer: ${error.message}`;
        writeLog(message, "error");
        console.error(message);
        resolve(false);
      }
      if (stdout) writeLog(`Shutdown stdout: ${stdout}`, "info");
      if (stderr) writeLog(`Shutdown stderr: ${stderr}`, "warn");
      resolve(true);
    });
  });
};

export const restartComputer = async (): Promise<boolean> => {
  writeLog("Received restart-computer request", "warn");
  const command = dataApp.getValue("isWindows")
    ? "shutdown /r /f /t 10"
    : "sudo shutdown -r now";

  return await new Promise((resolve) => {
    exec(command, (error, stdout, stderr) => {
      if (error) {
        const message = `Error restarting the computer: ${error.message}`;
        writeLog(message, "error");
        console.error(message);
        resolve(false);
      }
      if (stdout) writeLog(`Restart stdout: ${stdout}`, "info");
      if (stderr) writeLog(`Restart stderr: ${stderr}`, "warn");
      resolve(true);
    });
  });
};

const hasPermissionsMiddleware = (
  req: express.Request,
  res: express.Response,
  next: express.NextFunction
) => {
  try {
    const { deviceId } = req.body || {};
    writeLog(
      `Received deviceId: ${deviceId}, expected: ${dataApp.getValue(
        "deviceId"
      )} areEqual: ${deviceId === dataApp.getValue("deviceId")}`,
      "info"
    );
    if (!deviceId || deviceId !== dataApp.getValue("deviceId")) {
      const message = "Unauthorized request: Invalid or missing deviceId";
      writeLog(message, "warn");
      res.status(401).json({ error: message });
      return;
    }
  } catch (error) {
    const message = `Error in permissions middleware: ${error}`;
    writeLog(message, "error");
    res.status(500).json({ error: message });
    return;
  }
  next();
};

export const handleShutdown = async () => {
  if (isShuttingDown) return;
  isShuttingDown = true;
  try {
    writeLog("Executing shutdown commands...", "info");
    await executeTerminalCommands("Shut-down");
  } catch (err) {
    writeLog(`Error executing shutdown commands: ${err}`, "error");
  }
  writeLog("Shutting down gracefully...", "info");
  cleanAdAndServer();
  stopMemoryMonitor();
  setTimeout(() => process.exit(0), 500);
};

export const cleanAdAndServer = (): void => {
  const ad: DNSSD.Advertisement | null = dataApp.getValue("ad");
  const server: Server | null = dataApp.getValue("server");

  if (ad) {
    writeLog("Stopping mDNS advertisement...", "info");
    try {
      ad.stop?.();
    } catch (e) {
      writeLog(`Error stopping ad (ignoring): ${e}`, "warn");
    }
    dataApp.setValue("ad", null);
  }
  if (server) {
    writeLog("Closing server...", "info");
    try {
      server.close?.();
    } catch (e) {
      writeLog(`Error closing server (ignoring): ${e}`, "warn");
    }
    dataApp.setValue("server", null);
  }
};

export const scheduleReconnect = (reason: string) => {
  if (isReconnecting || isShuttingDown) {
    writeLog(
      `Reconnect ignored: (Reason: ${reason}, isReconnecting: ${isReconnecting}, isShuttingDown: ${isShuttingDown})`,
      "info"
    );
    return;
  }
  isReconnecting = true;

  const delay = Math.min(
    5000 * Math.pow(2, dataApp.getValue("reconnectAttempts")),
    60000
  );
  dataApp.setValue("reconnectAttempts", (prev) => prev + 1);
  writeLog(
    `Server stopped (${reason}). Reconnecting in ${delay / 1000}s...`,
    "warn"
  );

  if (idTimeoutServer) {
    clearTimeout(idTimeoutServer);
    idTimeoutServer = null;
  }

  idTimeoutServer = setTimeout(() => {
    writeLog("Reconnect timeout elapsed. Attempting to restart...", "info");
    idTimeoutServer = null;

    try {
      const server = dataApp.getValue("server");
      if (server) {
        server.close(() => {
          writeLog("Existing server closed. Restarting...", "info");
          initServer();
        });
      } else {
        writeLog("No existing server found. Restarting...", "info");
        initServer();
      }
    } catch (e) {
      writeLog(
        `Error during server close in reconnect: ${e}. Forcing restart.`,
        "error"
      );
      initServer();
    }
  }, delay);
};

export const initServer = (): void => {
  if (isShuttingDown) {
    writeLog("Shutdown in progress. Aborting server init.", "warn");
    return;
  }
  writeLog("Initializing server...", "info");

  if (!dataApp.getValue("hasSudo") && !dataApp.getValue("isWindows")) {
    writeLog(
      "Permissions missing (no sudo or not Windows). Server will not start.",
      "error"
    );
    return;
  }

  if (!dataApp.getValue("deviceId")) {
    dataApp.setValue("deviceId", machineId.machineIdSync());
  }

  if (dataApp.getValue("hasSudo")) {
    try {
      writeLog(`Configuring firewall...`, "info");
      execSync("sudo ufw allow 3005 && sudo ufw reload");
    } catch (err) {
      writeLog(`Error configuring firewall: ${err}`, "error");
    }
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
      writeLog(`Client log [${level}]: ${message}`, level);
      res.json({ success: true });
    });

    app.post("/turn-off-computer", hasPermissionsMiddleware, async (_, res) => {
      writeLog("Received /turn-off-computer request", "info");
      res.json({ success: await turnOffComputer() });
    });

    app.post("/restart-computer", hasPermissionsMiddleware, async (_, res) => {
      writeLog("Received /restart-computer request", "info");
      res.json({ success: await restartComputer() });
    });

    app.post("/change-image-format", handleChangeImageFormat);

    const server = app.listen(dataApp.getValue("PORT"), "0.0.0.0", () => {
      if (idTimeoutServer) {
        clearTimeout(idTimeoutServer);
        idTimeoutServer = null;
      }

      writeLog(`Server listening on port ${dataApp.getValue("PORT")}`, "info");

      isReconnecting = false;
      dataApp.setValue("reconnectAttempts", 0);

      try {
        const lanIP = dataApp.getValue("lanIP");
        const deviceId = dataApp.getValue("deviceId");
        const txt: AdvertisementTXT = {
          lanIP,
          deviceId: deviceId,
        };

        const ad = new DNSSD.Advertisement(
          DNSSD.tcp("http"),
          dataApp.getValue("PORT"),
          {
            name: lanIP.replace(/\./g, "-"),
            txt,
          }
        );
        ad.start();
        dataApp.setValue("ad", ad);
      } catch (error) {
        writeLog(`Error setting up mDNS: ${error}`, "error");
      }
    });

    server.on("error", (err: NodeJS.ErrnoException) => {
      writeLog(`Server error: ${err.message}`, "error");
      if (err.code === "EADDRINUSE") {
        writeLog("Port 3005 already in use. Retrying...", "warn");
        scheduleReconnect("EADDRINUSE");
      } else {
        scheduleReconnect("server_error");
      }
    });

    server.on("close", () => {
      writeLog("Server 'close' event fired.", "info");
      dataApp.setValue("server", null);

      if (isReconnecting || isShuttingDown) {
        writeLog("Server close was expected.", "info");
      } else {
        writeLog("Server closed unexpectedly. Scheduling reconnect...", "warn");
        scheduleReconnect("unexpected_close");
      }
    });

    dataApp.setValue("server", server);
  } catch (error) {
    writeLog(`Fatal error during server initialization: ${error}`, "error");
    scheduleReconnect("init_catch");
  }
};

process.on("uncaughtException", (err) => {
  writeLog(`Uncaught exception: ${err}`, "error");
  scheduleReconnect("uncaughtException");
});

process.on("unhandledRejection", (reason) => {
  writeLog(`Unhandled promise rejection: ${reason}`, "error");
  scheduleReconnect("unhandledRejection");
});

process.on("SIGINT", handleShutdown); // Ctrl+C
process.on("SIGTERM", handleShutdown); // 'kill'
