import path from "path";
import { app, Tray, Menu, nativeImage, BrowserWindow } from "electron";
import dataApp, { getLanguage, t, initServer, handleShutdown } from "@utils";

const createWindow = (): void => {
  const mainWindow = new BrowserWindow({
    width: 1000,
    height: 800,
    show: false,
    webPreferences: {
      sandbox: false,
      webSecurity: false,
      nodeIntegration: false,
      contextIsolation: true,
      preload: path.join(process.resourcesPath, "preload.js"),
    },
  });

  let htmlPath: string;

  if (app.isPackaged)
    htmlPath = path.join(
      process.resourcesPath,
      "app.asar",
      "dist",
      "index.html"
    );
  else htmlPath = path.join(path.dirname(__dirname), "dist", "index.html");

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
    const trayIconPath = path.join(
      process.resourcesPath,
      "app.asar",
      "dist",
      "assets",
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
        return;
      }
      mainWindow.hide();
    });

    dataApp.setValue("tray", tray);
    console.log("Tray was created successfully");
  } catch (error) {
    console.error("Error creating tray:", error);
  }
};

app.whenReady().then(() => {
  dataApp.setValue("language", getLanguage());
  createWindow();
  createTray();
  initServer();
});

app.on("window-all-closed", handleShutdown);

app.on("activate", () => {
  if (BrowserWindow.getAllWindows().length > 0) return;
  createWindow();
});

app.on("before-quit", () => {
  dataApp.setValue("isQuitting", true);
});
