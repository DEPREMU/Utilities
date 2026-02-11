import { getPath } from "@utils";
import dataApp from "./variables";
import { app, BrowserWindow, globalShortcut } from "electron";

export const createWindowClipboard = (showOnCreate: boolean = false): void => {
  try {
    console.log("Creating clipboard context menu...");

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

    const htmlPath = getPath("ASSETS", "index-clipboard.html");

    window.loadFile(htmlPath).catch((err) => {
      console.error("Error loading clipboard file:", err);
    });
    dataApp.setValue("clipboardWindow", window);

    console.log("Clipboard context menu created successfully");
  } catch (error) {
    console.error("Error creating clipboard context menu:", error);
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
        console.error(
          `Failed to register clipboard shortcut: ${shortcut.accelerator}`,
        );
      else
        console.log(`Registered clipboard shortcut: ${shortcut.accelerator}`);
    });

    console.log("Clipboard shortcuts registered successfully");
  } catch (error) {
    console.error("Error registering clipboard shortcuts:", error);
  }
};
