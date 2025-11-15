import {
  getHtmlPath,
  verifyNewUpdate,
  deleteDownloadedUpdate,
} from "./utils/updates";
import dataApp, {
  t,
  writeLog,
  initServer,
  getLanguage,
  handleShutdown,
  startMemoryMonitor,
  executeTerminalCommands,
} from "@utils";
import path from "path";
import { exec } from "child_process";
import { app, Tray, Menu, nativeImage, BrowserWindow } from "electron";

try {
  executeTerminalCommands("Start-up");
} catch (error) {
  writeLog("Error executing start-up commands: " + String(error), "error");
}

if (dataApp.getValue("isWindows") && app.isPackaged) {
  exec(
    `schtasks /create /tn "UtilitiesForPC" /tr "${process.execPath}" /sc onlogon /rl highest /f`,
    (error) => {
      if (error) writeLog("Error creating task:" + error, "error");
      else writeLog("Scheduled task created successfully.", "info");
    }
  );
}

const getAssetsPath = (...segments: string[]): string => {
  if (app.isPackaged) {
    return path.join(
      process.resourcesPath,
      "app.asar",
      "dist",
      "assets",
      ...segments
    );
  } else {
    return path.join(path.dirname(__dirname), "dist", "assets", ...segments);
  }
};

const createWindow = async (): Promise<void> => {
  const preloadPath = app.isPackaged
    ? path.join(process.resourcesPath, "preload.cjs")
    : path.join(path.dirname(__dirname), "build", "preload.cjs");

  const mainWindow = new BrowserWindow({
    width: 1000,
    height: 800,
    show: false,
    webPreferences: {
      sandbox: false,
      webSecurity: false,
      nodeIntegration: false,
      contextIsolation: true,
      preload: preloadPath,
    },
  });

  const htmlPath = getHtmlPath();

  mainWindow.loadFile(htmlPath).catch((err) => {
    console.error("Error loading file:", err);
  });

  mainWindow.on("close", (event) => {
    if (dataApp.getValue("isQuitting")) return;

    event.preventDefault();
    mainWindow?.hide();
  });

  mainWindow.once("ready-to-show", () => {
    mainWindow?.show();
  });

  dataApp.setValue("mainWindow", mainWindow);
};

const createTray = (): void => {
  try {
    console.log("Creating tray...");

    const trayIconPath = getAssetsPath(
      dataApp.getValue("isWindows") ? "tray-icon.ico" : "tray-icon.png"
    );

    const trayIcon = nativeImage.createFromPath(trayIconPath);

    if (trayIcon.isEmpty()) {
      console.error("Could not load tray icon:", trayIconPath);
      return;
    }

    const tray = new Tray(trayIcon);
    const mainWindow = dataApp.getValue("mainWindow");

    const contextMenu = Menu.buildFromTemplate([
      {
        label: t("show"),
        click: () => {
          mainWindow?.show();
          mainWindow?.focus();
        },
      },
      {
        label: t("exit"),
        click: () => {
          dataApp.setValue("isQuitting", true);
          app.quit();
        },
      },
    ]);

    tray.setToolTip(t("trayTooltip") || "Utilities for PC");
    tray.setContextMenu(contextMenu);

    tray.on("click", () => {
      if (!mainWindow?.isVisible()) {
        mainWindow?.show();
        mainWindow?.focus();
      } else mainWindow.hide();
    });

    dataApp.setValue("tray", tray);
    console.log("Tray was created successfully");
  } catch (error) {
    console.error("Error creating tray:", error);
  }
};

app.whenReady().then(async () => {
  await verifyNewUpdate("electron");
  deleteDownloadedUpdate();
  dataApp.setValue("language", getLanguage());
  createWindow();
  createTray();
  initServer();
  startMemoryMonitor();
});

app.on("window-all-closed", handleShutdown);

app.on("activate", () => {
  if (BrowserWindow.getAllWindows().length > 0) return;
  createWindow();
});

app.on("before-quit", () => {
  dataApp.setValue("isQuitting", true);
});
