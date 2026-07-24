import {
  createWindowClipboard,
  registerClipboardShortcuts,
} from "./utils/clipboard";
import {
  app,
  Tray,
  Menu,
  nativeImage,
  BrowserWindow,
  powerSaveBlocker,
} from "electron";
import dataApp, {
  t,
  Paths,
  Logger,
  initServer,
  getLanguage,
  handleShutdown,
  executeTerminalCommands,
} from "@utils";
import os from "os";
import path from "path";
import { exec, spawn } from "child_process";
import { File, Directory, startMemoryMonitor } from "@common";
import { verifyNewUpdate, deleteDownloadedUpdate } from "./utils/updates";

const loadSevenZip = async () => {
  const sevenZipPath = path.join(
    __dirname,
    "node_modules/7zip-bin/linux/x64/7za",
  );

  try {
    const file = new File(sevenZipPath);

    if (await file.exists()) await file.chmod(0o755);
  } catch (err) {
    Logger.error("Could not change permissions for 7za", err);
  }

  exec(
    "sudo apt-get install -y libgtk-3-0 libnotify4 libnss3 libxss1 libxtst6 xdg-utils libatspi2.0-0 libuuid1 libsecret-1-0 libappindicator3-1 gnome-keyring libsecret-tools",
    (e) => {
      if (!e) return;

      Logger.warn("Some system dependencies may be missing:", e.message);
    },
  );
};

if (!dataApp.getValue("isWindows") && app.isPackaged) loadSevenZip();

try {
  executeTerminalCommands("Start-up");
} catch (error) {
  Logger.error("Error executing start-up commands:", error);
}

const setupAutostart = async () => {
  try {
    if (dataApp.getValue("isWindows")) {
      exec(
        `schtasks /create /tn "UtilitiesForPC" /tr "${process.execPath}" /sc onlogon /rl highest /f`,
        (error) => {
          if (error) Logger.error("Error creating task:", error.message);
          else Logger.log("Scheduled task created successfully.");
        },
      );
    } else {
      const sudo = (command: string, args: string[] = [], stdin?: string) => {
        try {
          const child = spawn("sudo", [command, ...args], {
            stdio: ["pipe", "pipe", "pipe"],
          });

          if (stdin !== undefined) {
            child.stdin.write(stdin);
            child.stdin.end();
          } else {
            child.stdin.end();
          }

          child.stdout.on("data", (data) => {
            Logger.log(data.toString());
          });

          child.stderr.on("data", (data) => {
            Logger.warn(data.toString());
          });

          child.on("error", (error) => {
            Logger.error(error.message, "error");
          });

          return child;
        } catch (error) {
          Logger.error(String(error), "error");
          return null;
        }
      };

      try {
        const userName = dataApp.getValue("username");
        const userHome = dataApp.getValue("userHome");

        if (!userName || !userHome) {
          Logger.error("Cannot setup autostart: USER or HOME not defined");
          return;
        }

        const configDir = path.join(userHome, ".config");
        const autoStartDir = path.join(configDir, "autostart");
        const startUpFile = path.join(
          configDir,
          "utilities-for-pc-autostart.sh",
        );
        const desktopFilePath = path.join(
          autoStartDir,
          "utilities-for-pc.desktop",
        );
        const wrapperScriptPath = `/opt/UtilitiesForPC/utilities-for-pc-root.sh`;

        const dir = new Directory(autoStartDir);
        if (!(await dir.exists())) {
          await dir.mkdir({ recursive: true });
          sudo(`chown -R ${userName}:${userName} "${configDir}"`);
        }

        const wrapperScriptContent = `#!/bin/bash
# Wrapper to run UtilitiesForPC as root with correct environment
# Usage: ./utilities-for-pc-root.sh <USER_ID> <USER_HOME> <USER_NAME> <DBUS_ADDR>

USER_ID=$1
USER_HOME=$2
USER_NAME=$3
DBUS_ADDR=$4

if [ -z "$USER_ID" ] || [ -z "$USER_HOME" ]; then
    echo "Error: Missing arguments"
    exit 1
fi

export DISPLAY=:0
export XAUTHORITY="$USER_HOME/.Xauthority"
export DBUS_SESSION_BUS_ADDRESS="$DBUS_ADDR"
export XDG_RUNTIME_DIR="/run/user/$USER_ID"
export ORIGINAL_USER="$USER_NAME"
export ORIGINAL_HOME="$USER_HOME"

exec ${process.execPath} --no-sandbox --disable-gpu --ozone-platform=x11 "\${@:5}"
`;

        const startupScriptContent = `#!/bin/bash

xhost +si:localuser:root 2>/dev/null || true

USER_ID=$(id -u ${userName})
USER_HOME="${userHome}"
USER_NAME="${userName}"

DBUS_ADDR="$DBUS_SESSION_BUS_ADDRESS"
if [ -z "$DBUS_ADDR" ]; then
    DBUS_ADDR="unix:path=/run/user/$USER_ID/bus"
fi

LOG_FILE="${userHome}/.config/utilities-for-pc-startup.log"
mkdir -p "$(dirname "$LOG_FILE")"

echo "[$(date)] Starting Utilities for PC (Autostart)..." >> "$LOG_FILE"
echo "DBUS_ADDR: $DBUS_ADDR" >> "$LOG_FILE"

sudo ${wrapperScriptPath} "$USER_ID" "$USER_HOME" "$USER_NAME" "$DBUS_ADDR" >> "$LOG_FILE" 2>&1 &

echo "[$(date)] Startup script completed" >> "$LOG_FILE"
`;

        const desktopFileContent = `[Desktop Entry]
Type=Application
Exec=${startUpFile}
Terminal=false
Hidden=false
NoDisplay=false
X-GNOME-Autostart-enabled=true
Name=Utilities for PC
Comment=Start Utilities for PC on login with root privileges
Categories=Utility;
StartupNotify=false
`;

        const tempWrapper = path.join(
          os.tmpdir(),
          `utilities-for-pc-root-${Date.now()}.sh`,
        );

        await Promise.all([
          new File(startUpFile).writeFile(startupScriptContent, "utf-8"),
          new File(tempWrapper).writeFile(wrapperScriptContent, "utf-8"),
          new File(desktopFilePath).writeFile(desktopFileContent, "utf-8"),
        ]);

        sudo("cp", [tempWrapper, wrapperScriptPath]);

        sudo("chmod", ["+x", wrapperScriptPath]);

        sudo("chmod", ["+x", startUpFile]);
        sudo("chmod", ["+x", desktopFilePath]);

        sudo("chown", [`${userName}:${userName}`, startUpFile]);
        sudo("chown", [`${userName}:${userName}`, desktopFilePath]);

        const sudoersEntry = `# UtilitiesForPC auto-start with root privileges
${userName} ALL=(ALL) NOPASSWD: ${wrapperScriptPath}
${userName} ALL=(ALL) NOPASSWD: /usr/bin/xhost
`;

        sudo("tee", ["/etc/sudoers.d/utilitiesforpc"], sudoersEntry);
        sudo("chmod", ["0440", "/etc/sudoers.d/utilitiesforpc"]);

        Logger.log("Linux autostart configured successfully.");
      } catch (error) {
        Logger.error("Error configuring autostart:", error);
      }
    }
  } catch (error) {
    Logger.error("Error setting up autostart:", error);
  }
};

if (app.isPackaged) setupAutostart();

let creatingMainWindow = false;

const createWindow = (): void => {
  if (creatingMainWindow || dataApp.getValue("mainWindow")) return;
  creatingMainWindow = true;

  const mainWindow = new BrowserWindow({
    width: 1000,
    height: 800,
    show: !app.isPackaged,
    webPreferences: {
      sandbox: false,
      preload: dataApp.getValue("preloadPath"),
      webSecurity: true, //TODO: Check if this is needed, it may cause issues with some features
      nodeIntegration: false,
      contextIsolation: true,
      backgroundThrottling: false,
    },
  });

  if (app.isPackaged) {
    const htmlPath = Paths.getPath("DIST", "index.html");

    mainWindow.loadFile(htmlPath).catch((err) => {
      Logger.error("Error loading file:", err);
    });
  } else {
    mainWindow.loadURL("http://localhost:8081").catch((err) => {
      Logger.error("Error loading URL:", err);
    });
  }

  mainWindow.on("close", (event) => {
    if (dataApp.getValue("isQuitting")) return;

    event.preventDefault();
    mainWindow?.hide();
  });

  mainWindow.once(
    "ready-to-show",
    () => !app.isPackaged && mainWindow.webContents.openDevTools(),
  );

  dataApp.setValue("mainWindow", mainWindow);
  creatingMainWindow = false;
};

const createTray = (): void => {
  try {
    Logger.log("Creating tray...");

    const trayIconPath = Paths.getPath(
      "ASSETS",
      dataApp.getValue("isWindows") ? "tray-icon.ico" : "tray-icon.png",
    );

    const trayIcon = nativeImage.createFromPath(trayIconPath);

    if (trayIcon.isEmpty()) {
      Logger.error("Could not load tray icon:", trayIconPath);
      return;
    }

    const tray = new Tray(trayIcon);

    const contextMenu = Menu.buildFromTemplate([
      {
        label: t("show"),
        click: () => {
          const mainWindow = dataApp.getValue("mainWindow");

          mainWindow?.show();
          mainWindow?.focus();
        },
      },
      {
        label: t("exit"),
        click: async () => {
          dataApp.setValue("isQuitting", true);
          await handleShutdown();
        },
      },
    ]);

    tray.setToolTip(t("trayTooltip") || "Utilities for PC");
    tray.setContextMenu(contextMenu);

    tray.on("click", () => {
      const mainWindow = dataApp.getValue("mainWindow");

      if (!mainWindow?.isVisible()) {
        mainWindow?.show();
        mainWindow?.focus();
      } else mainWindow.hide();
    });

    dataApp.setValue("tray", tray);
    Logger.log("Tray was created successfully");
  } catch (error) {
    Logger.error("Error creating tray:", error);
  }
};

app.whenReady().then(async () => {
  await verifyNewUpdate("electron");
  await verifyNewUpdate("web");
  powerSaveBlocker.start("prevent-app-suspension");
  deleteDownloadedUpdate();
  dataApp.setValue("language", getLanguage());
  createWindow();
  createWindowClipboard();
  createTray();
  initServer();
  startMemoryMonitor();
  registerClipboardShortcuts();
});

app.on("window-all-closed", handleShutdown);

app.on("activate", () => {
  if (BrowserWindow.getAllWindows().length) return;
  createWindow();
});

app.on("before-quit", () => {
  dataApp.setValue("isQuitting", true);
});
