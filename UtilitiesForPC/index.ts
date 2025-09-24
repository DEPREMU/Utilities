import path from "path";
import { fileURLToPath } from "url";
import { app, BrowserWindow, Tray, Menu, nativeImage, ipcMain } from "electron";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

type LanguagesSupported = "en" | "es";

type Translations = {
  show: string;
  exit: string;
  trayTooltip: string;
};

/**
 * Gets the current language setting based on the application locale.
 *
 * @returns The supported language code. Returns "es" for Spanish locales
 * (any locale starting with "es"), otherwise returns "en" for English.
 */
const getLanguage = (): LanguagesSupported => {
  const lang = app.getLocale();
  if (lang.startsWith("es")) return "es";
  return "en";
};

/**
 * Retrieves a translated string for the given key based on the current language.
 *
 * @param key - The translation key to look up from the Translations interface
 * @returns The translated string for the current language, or the key itself if translation is not found
 *
 * @example
 * ```typescript
 * const showText = t('show'); // Returns "Show" for English or "Mostrar" for Spanish
 * ```
 */
const t = (key: keyof Translations): string => {
  const translations: Record<LanguagesSupported, Translations> = {
    en: { show: "Show", exit: "Exit", trayTooltip: "Utilities for PC" },
    es: { show: "Mostrar", exit: "Salir", trayTooltip: "Utilidades para PC" },
  };
  return translations[language]?.[key] || key;
};

let isQuitting = false;
let userIsLoggedIn = false;
let tray: Tray | null = null;
let language: LanguagesSupported = "en";
let mainWindow: BrowserWindow | null = null;

ipcMain.on("user-login-status", async (_, isLoggedIn: boolean) => {
  userIsLoggedIn = isLoggedIn;

  if (!mainWindow) return;
  if (userIsLoggedIn) mainWindow.hide();
  else mainWindow.show();
});

const createWindow = (): void => {
  mainWindow = new BrowserWindow({
    width: 1000,
    height: 800,
    show: true,
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
    if (isQuitting) return;

    event.preventDefault();
    mainWindow?.hide();
  });

  mainWindow.once("ready-to-show", () => {
    mainWindow?.show();
  });
};

const createTray = (): void => {
  try {
    let trayIconPath: string;

    if (app.isPackaged)
      trayIconPath = path.join(
        process.resourcesPath,
        "app.asar",
        "dist",
        "assets",
        "tray-icon.ico"
      );
    else
      trayIconPath = path.join(
        path.dirname(__dirname),
        "dist",
        "assets",
        "tray-icon.ico"
      );

    const trayIcon = nativeImage.createFromPath(trayIconPath);

    if (trayIcon.isEmpty()) {
      console.error("Could not load tray icon:", trayIconPath);
      return;
    }

    tray = new Tray(trayIcon);

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
          isQuitting = true;
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

    console.log("Tray was created successfully");
  } catch (error) {
    console.error("Error creating tray:", error);
  }
};

app.whenReady().then(() => {
  language = getLanguage();
  createWindow();
  createTray();
});

app.on("window-all-closed", () => {
  if (process.platform === "darwin") return;
  app.quit();
});

app.on("activate", () => {
  if (BrowserWindow.getAllWindows().length > 0) return;
  createWindow();
});

app.on("before-quit", () => {
  isQuitting = true;
});
