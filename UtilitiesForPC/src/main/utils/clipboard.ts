import dataApp from "./vars/variables";
import { Paths, Logger } from "@utils";
import { app, BrowserWindow, globalShortcut } from "electron";

const logger = new Logger("Clipboard");

export const createWindowClipboard = (showOnCreate: boolean = false): void => {
  try {
    const existingWindow = dataApp.getValue("clipboardWindow");
    if (existingWindow && !existingWindow.isDestroyed()) {
      if (showOnCreate) {
        existingWindow.show();
        existingWindow.focus();
      }
      return;
    }

    logger.log("Creating clipboard context menu...");

    const window = new BrowserWindow({
      width: 400,
      height: 300,
      show: false,
      webPreferences: {
        sandbox: false,
        preload: dataApp.getValue("preloadPath"),
        webSecurity: false,
        nodeIntegration: false,
        contextIsolation: true,
        backgroundThrottling: false,
      },
    });

    window.on("ready-to-show", () => {
      if (showOnCreate) window.show();
      if (!app.isPackaged) window.webContents?.openDevTools();
    });

    window.on("close", (event) => {
      event.preventDefault();
      window.hide();
    });

    if (app.isPackaged) {
      const htmlPath = Paths.getPath("ASSETS", "clipboard", "index.html");

      window.loadFile(htmlPath).catch((err) => {
        logger.error("Error loading file:", err);
      });
    } else {
      window.loadURL("http://localhost:5173").catch((err) => {
        logger.error("Error loading URL:", err);
      });
    }
    dataApp.setValue("clipboardWindow", window);

    logger.log("Clipboard context menu created successfully");
  } catch (error) {
    logger.error("Error creating clipboard context menu:", error);
  }
};

export const registerClipboardShortcuts = (): void => {
  try {
    const shortcuts = [
      {
        accelerator: "Ctrl+Alt+V",
        action: () => {
          const clipboardWindow = dataApp.getValue("clipboardWindow");

          if (!clipboardWindow || clipboardWindow.isDestroyed())
            return createWindowClipboard(true);

          clipboardWindow.show();
          clipboardWindow.focus();
        },
      },
    ];

    shortcuts.forEach((shortcut) => {
      const registered = globalShortcut.register(
        shortcut.accelerator,
        shortcut.action,
      );

      if (!registered)
        logger.error(
          `Failed to register clipboard shortcut: ${shortcut.accelerator}`,
        );
      else logger.log(`Registered clipboard shortcut: ${shortcut.accelerator}`);
    });

    logger.log("Clipboard shortcuts registered successfully");
  } catch (error) {
    logger.error("Error registering clipboard shortcuts:", error);
  }
};
