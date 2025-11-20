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
import { app, Tray, Menu, nativeImage, BrowserWindow } from "electron";
import { exec, execSync } from "child_process";

if (!dataApp.getValue("isWindows") && app.isPackaged) {
  try {
    exec(
      "sudo apt-get install -y libgtk-3-0 libnotify4 libnss3 libxss1 libxtst6 xdg-utils libatspi2.0-0 libuuid1 libsecret-1-0 libappindicator3-1 gnome-keyring libsecret-tools",
      (e) => {
        if (e) {
          writeLog("Some system dependencies may be missing: " + e, "warn");
        }
      }
    );
  } catch (error) {
    writeLog(
      "Some system dependencies may be missing. Install them with: ",
      "warn"
    );
  }
}

try {
  executeTerminalCommands("Start-up");
} catch (error) {
  writeLog("Error executing start-up commands: " + String(error), "error");
}

const setupAutostart = () => {
  try {
    if (dataApp.getValue("isWindows")) {
      exec(
        `schtasks /create /tn "UtilitiesForPC" /tr "${process.execPath}" /sc onlogon /rl highest /f`,
        (error) => {
          if (error) writeLog("Error creating task:" + error, "error");
          else writeLog("Scheduled task created successfully.", "info");
        }
      );
    } else {
      const userName =
        process.env.ORIGINAL_USER ||
        process.env.SUDO_USER ||
        process.env.USER ||
        process.env.USERNAME;
      const userHome =
        process.env.ORIGINAL_HOME ||
        (process.env.SUDO_USER && process.env.SUDO_USER !== "root"
          ? `/home/${process.env.SUDO_USER}`
          : process.env.HOME);

      if (!userName || !userHome) {
        writeLog("Cannot setup autostart: USER or HOME not defined", "error");
        return;
      }

      const configDir = path.join(userHome, ".config");
      const autoStartDir = path.join(configDir, "autostart");
      const startUpFile = path.join(configDir, "utilities-for-pc-autostart.sh");
      const desktopFilePath = path.join(
        autoStartDir,
        "utilities-for-pc.desktop"
      );
      const wrapperScriptPath = `/opt/UtilitiesForPC/utilities-for-pc-root.sh`;

      if (!require("fs").existsSync(autoStartDir)) {
        require("fs").mkdirSync(autoStartDir, { recursive: true });
        execSync(`chown -R ${userName}:${userName} ${configDir}`);
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

# Configure environment for root to access user session
export DISPLAY=:0
export XAUTHORITY="$USER_HOME/.Xauthority"
export DBUS_SESSION_BUS_ADDRESS="$DBUS_ADDR"
export XDG_RUNTIME_DIR="/run/user/$USER_ID"
export ORIGINAL_USER="$USER_NAME"
export ORIGINAL_HOME="$USER_HOME"

# Run the app
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

      require("fs").writeFileSync(startUpFile, startupScriptContent);
      require("fs").writeFileSync(desktopFilePath, desktopFileContent);

      const tempWrapper = path.join(
        require("os").tmpdir(),
        `utilities-for-pc-root-${Date.now()}.sh`
      );
      try {
        require("fs").writeFileSync(tempWrapper, wrapperScriptContent);
        execSync(`cp ${tempWrapper} ${wrapperScriptPath}`);
        execSync(`chmod +x ${wrapperScriptPath}`);
      } catch (e) {
        try {
          execSync(`mv ${tempWrapper} ${wrapperScriptPath}`);
          execSync(`chmod +x ${wrapperScriptPath}`);
        } catch (err) {
          writeLog("Failed to update wrapper script: " + String(err), "error");
        }
      }

      execSync(`chmod +x ${startUpFile}`);
      execSync(`chmod +x ${desktopFilePath}`);
      execSync(`chown ${userName}:${userName} ${startUpFile}`);
      execSync(`chown ${userName}:${userName} ${desktopFilePath}`);

      const fileSudoers = "utilitiesforpc";
      const sudoersEntry = `# UtilitiesForPC auto-start with root privileges
${userName} ALL=(ALL) NOPASSWD: ${wrapperScriptPath}
${userName} ALL=(ALL) NOPASSWD: /usr/bin/xhost
`;

      try {
        execSync(`echo "${sudoersEntry}" > /etc/sudoers.d/${fileSudoers}`);
        execSync(`chmod 0440 /etc/sudoers.d/${fileSudoers}`);
        writeLog("Linux autostart configured successfully.", "info");
      } catch (error) {
        writeLog("Error configuring sudoers: " + String(error), "error");
      }
    }
  } catch (error) {
    writeLog("Error setting up autostart: " + String(error), "error");
  }
};

if (app.isPackaged) setupAutostart();

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
