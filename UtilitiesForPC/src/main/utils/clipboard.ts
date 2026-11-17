import dataApp from "./vars/variables";
import { Timers } from "@common";
import { Paths, Logger } from "@utils";
import { ValidClearTimeout } from "@types";
import { uIOhook, UiohookKey, UiohookKeyboardEvent } from "uiohook-napi";
import { app, BrowserWindow, clipboard, globalShortcut } from "electron";

const logger = new Logger("Clipboard");

const DOUBLE_CTRL_C_WINDOW_MS = 600;
const CLIPBOARD_READ_DELAY_MS = 50;

let isHookRunning = false;
let isCKeyDown = false;
let lastCtrlCTime = 0;
let readTimeoutId: ValidClearTimeout = null;

const handleHookKeyDown = (event: UiohookKeyboardEvent): void => {
  if (event.keycode !== UiohookKey.C) return;
  if (isCKeyDown) return;

  isCKeyDown = true;

  if (!event.ctrlKey) return;

  const now = Date.now();
  if (lastCtrlCTime > 0 && now - lastCtrlCTime <= DOUBLE_CTRL_C_WINDOW_MS) {
    lastCtrlCTime = 0;

    if (readTimeoutId) Timers.clearTimeout(readTimeoutId);
    readTimeoutId = Timers.setTimeout(async () => {
      readTimeoutId = null;

      const mainWindow = dataApp.getValue("mainWindow");
      if (!mainWindow || mainWindow.isDestroyed()) return;

      const text = await clipboard.readText();
      if (text) mainWindow.webContents.send("clipboard-double-ctrl-c", text);
    }, CLIPBOARD_READ_DELAY_MS);
    return;
  }

  lastCtrlCTime = now;
};

const handleHookKeyUp = (event: UiohookKeyboardEvent): void => {
  if (event.keycode === UiohookKey.C) isCKeyDown = false;
};

const startDoubleCtrlCListener = (): void => {
  if (isHookRunning) return;

  try {
    isCKeyDown = false;
    lastCtrlCTime = 0;
    uIOhook.on("keydown", handleHookKeyDown);
    uIOhook.on("keyup", handleHookKeyUp);
    uIOhook.start();
    isHookRunning = true;
    logger.log("Double Ctrl+C clipboard listener started");
  } catch (error) {
    logger.error("Error starting double Ctrl+C clipboard listener:", error);
  }
};

export const stopDoubleCtrlCListener = (): void => {
  if (readTimeoutId) {
    Timers.clearTimeout(readTimeoutId);
    readTimeoutId = null;
  }

  isCKeyDown = false;
  lastCtrlCTime = 0;

  if (!isHookRunning) return;

  try {
    uIOhook.off("keydown", handleHookKeyDown);
    uIOhook.off("keyup", handleHookKeyUp);
    uIOhook.stop();
    isHookRunning = false;
    logger.log("Double Ctrl+C clipboard listener stopped");
  } catch (error) {
    logger.error("Error stopping double Ctrl+C clipboard listener:", error);
  }
};

export const setDoubleCtrlCListener = (enabled: boolean): void => {
  if (enabled) startDoubleCtrlCListener();
  else stopDoubleCtrlCListener();
};

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
