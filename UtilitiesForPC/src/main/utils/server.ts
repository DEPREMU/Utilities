import os from "os";
import cors from "cors";
import DNSSD from "dnssd";
import express from "express";
import dataApp from "./variables";
import machineId from "node-machine-id";
import { writeLog } from "./logger";
import { exec, execSync } from "child_process";
import { AdvertisementTXT } from "@types";

let idTimeout: NodeJS.Timeout | number | null = null;

export const turnOffComputer = async (): Promise<boolean> => {
  writeLog("Received turn-off-computer request", "warn");
  const command = dataApp.getValue("isWindows")
    ? "shutdown /s /f /t 10"
    : "sudo shutdown -h +0.2";

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
    : "sudo shutdown -r +0.2";

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

process.on("uncaughtException", (err) => {
  writeLog(`Uncaught exception: ${err}`, "error");
  scheduleReconnect("uncaughtException");
});

process.on("unhandledRejection", (reason) => {
  writeLog(`Unhandled promise rejection: ${reason}`, "error");
  scheduleReconnect("unhandledRejection");
});

const scheduleReconnect = (reason: string) => {
  const delay = Math.min(
    5000 * Math.pow(2, dataApp.getValue("reconnectAttempts")),
    60000
  );
  dataApp.setValue("reconnectAttempts", (prev) => prev + 1);
  writeLog(
    `Server stopped (${reason}). Reconnecting in ${delay / 1000}s...`,
    "warn"
  );

  if (idTimeout) clearTimeout(idTimeout as NodeJS.Timeout);
  idTimeout = setTimeout(() => {
    try {
      dataApp.getValue("server")?.close?.(() => {
        writeLog("Server closed, attempting to restart...", "info");
        initServer();
      });
    } catch {
      initServer();
    }
  }, delay);
};

export const createAdvertiser = (): void => {
  const lanIP = dataApp.getValue("lanIP");
  let ad = dataApp.getValue("ad");
  if (ad) ad.stop();

  const txt: AdvertisementTXT = {
    lanIP,
    deviceId: dataApp.getValue("deviceId"),
  };

  ad = new DNSSD.Advertisement(DNSSD.tcp("http"), dataApp.getValue("PORT"), {
    name: lanIP.replace(/\./g, "-"),
    txt,
  });
  ad?.start();
  dataApp.setValue("ad", ad);
};

export const initServer = (): void => {
  writeLog("Initializing server...", "info");

  if (!dataApp.getValue("hasSudo") && !dataApp.getValue("isWindows")) return;

  if (!dataApp.getValue("deviceId"))
    dataApp.setValue("deviceId", machineId.machineIdSync());

  if (dataApp.getValue("hasSudo")) {
    try {
      execSync("sudo ufw allow 3005 && sudo ufw reload");
    } catch (err) {
      writeLog(`Error configuring firewall: ${err}`, "error");
    }
  }

  try {
    const app = express();
    app.use(express.json());
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

    const server = app.listen(dataApp.getValue("PORT"), "0.0.0.0", () => {
      writeLog(`Server listening on port ${dataApp.getValue("PORT")}`, "info");
      dataApp.setValue("reconnectAttempts", 0);
      createAdvertiser();
    });

    server.on("error", (err: NodeJS.ErrnoException) => {
      writeLog(`Server error: ${err.message}`, "error");
      if (err.code === "EADDRINUSE") {
        writeLog("Port 3005 already in use. Retrying...", "warn");
        scheduleReconnect("EADDRINUSE");
      } else {
        scheduleReconnect("error");
      }
    });

    server.on("close", () => {
      scheduleReconnect("close");
    });

    dataApp.setValue("server", server);
  } catch (error) {
    writeLog(`Error initializing server: ${error}`, "error");
    setTimeout(() => initServer(), 3000);
  }
};
