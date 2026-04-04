/**
 * This script builds the Electron app for Windows and Linux.
 * It first builds the web version of the app, then packages it using Electron Builder.
 * Make sure to run this script in an environment where you have the necessary permissions.
 * Requires Node.js and yarn to be installed.
 * Run this script from the root directory Utilities/ where the UtilitiesForPC folder is located, or from the UtilitiesForPC directory.
 * Usage: `node createApp.js` or `node UtilitiesForPC/createApp.js`
 *
 * Platform-specific builds:
 * - Linux → Linux: Native build
 * - Windows → Windows: Native build
 *
 * @example
 * yarn run build-app --platform=linux  # Build only for Linux
 * yarn run build-app --platform=windows  # Build only for Windows
 */

import {
  ask,
  ARGS,
  getArgs,
  PLATFORM,
  UTILITIES_PATH,
  handleExitFromScript,
  UTILITIES_FOR_PC_PATH,
  PACKAGE_JSON_UtilitiesForPC,
} from "../config.ts";
import fs from "fs";
import os from "os";
import path from "path";
import { t } from "./translations.ts";
import { execSync } from "child_process";

type BuildPlatform = "linux" | "windows";

const removeDirSafe = (dirPath: string) => {
  try {
    if (fs.existsSync(dirPath))
      fs.rmSync(dirPath, { recursive: true, force: true });
  } catch {}
};

const TEMP_FOLDER = path.join(
  UTILITIES_PATH,
  "..",
  ".temp-utilities-for-pc-build",
);

const dataBuild = {
  distElectron: path.join(
    TEMP_FOLDER,
    PACKAGE_JSON_UtilitiesForPC.build.directories.output,
  ),
  appName: PACKAGE_JSON_UtilitiesForPC.name,
  productName: PACKAGE_JSON_UtilitiesForPC.build.productName,
} as const;

removeDirSafe(TEMP_FOLDER);
fs.mkdirSync(TEMP_FOLDER, { recursive: true });

const addAutostartLinux = async () => {
  const answer0 = ARGS.yes ? "y" : await ask(t("enableAutoStartQuestion"));
  if (answer0.toLowerCase() !== "y") return;

  const homePath = process.env.HOME;
  if (!homePath) throw new Error("HOME environment variable is not set");

  const userName = process.env.USER || process.env.USERNAME;
  if (!userName) throw new Error("USER environment variable is not set");

  const configDir = path.join(homePath, ".config");
  const startUpFile = path.join(configDir, "utilities-for-pc-autostart.sh");
  const autoStartDir = path.join(configDir, "autostart");
  const wrapperScriptPath = `/opt/${dataBuild.productName}/utilities-for-pc-root.sh`;

  if (!fs.existsSync(autoStartDir))
    fs.mkdirSync(autoStartDir, { recursive: true });

  const desktopFilePath = path.join(autoStartDir, "utilities-for-pc.desktop");

  const wrapperScriptContent = `#!/bin/bash

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

echo "Starting app as root..."
echo "User: $USER_NAME (ID: $USER_ID)"
echo "DBus: $DBUS_SESSION_BUS_ADDRESS"

exec /opt/${dataBuild.productName}/${dataBuild.appName} --no-sandbox --disable-gpu --ozone-platform=x11 "\${@:5}"
`;

  const startupScriptContent = `#!/bin/bash

xhost +si:localuser:root 2>/dev/null || true

USER_ID=$(id -u ${userName})
USER_HOME="${homePath}"
USER_NAME="${userName}"

DBUS_ADDR="$DBUS_SESSION_BUS_ADDRESS"
if [ -z "$DBUS_ADDR" ]; then
    DBUS_ADDR="unix:path=/run/user/$USER_ID/bus"
fi

LOG_FILE="${homePath}/.config/utilities-for-pc-startup.log"
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

  const fileSudoers = "utilitiesforpc";
  const sudoersEntry = `
${userName} ALL=(ALL) NOPASSWD: ${wrapperScriptPath}
${userName} ALL=(ALL) NOPASSWD: /usr/bin/xhost
`;

  try {
    const tempWrapper = path.join(
      os.tmpdir(),
      `utilities-for-pc-root-${Date.now()}.sh`,
    );
    fs.writeFileSync(tempWrapper, wrapperScriptContent);
    execSync(`sudo mv ${tempWrapper} ${wrapperScriptPath}`);
    execSync(`sudo chmod +x ${wrapperScriptPath}`);

    execSync(
      `sudo sh -c 'echo "${sudoersEntry}" > /etc/sudoers.d/${fileSudoers}'`,
    );
    execSync(`sudo chmod 0440 /etc/sudoers.d/${fileSudoers}`);
  } catch (error) {
    console.error("Failed to configure system files:", error);
    throw error;
  }

  fs.writeFileSync(startUpFile, startupScriptContent);
  execSync(`chmod +x ${startUpFile}`);

  fs.writeFileSync(desktopFilePath, desktopFileContent);
  execSync(`chmod +x ${desktopFilePath}`);

  console.log(t("autoStartEnabled"));
};

const buildApp = async () => {
  const buildPlatform: BuildPlatform = PLATFORM.isWindows ? "windows" : "linux";

  console.log(t("elevatingPermissions"));

  console.log(t("buildingApp") + ` (isWindows=${PLATFORM.isWindows})`);
  execSync(
    `yarn run build-resources-electron --isWindows=${PLATFORM.isWindows}`,
    {
      cwd: UTILITIES_PATH,
      stdio: "inherit",
    },
  );
  const PATHS = [
    path.join(UTILITIES_FOR_PC_PATH, "dist"),
    path.join(UTILITIES_FOR_PC_PATH, "build"),
    path.join(UTILITIES_FOR_PC_PATH, "assets"),
    path.join(UTILITIES_FOR_PC_PATH, "package.json"),
  ];
  PATHS.forEach((dir) => {
    if (!fs.existsSync(dir))
      throw new Error(t("failedToFindAFolderRequiredForBuild") + dir);

    if (
      dir.endsWith("build") ||
      dir.endsWith("assets") ||
      dir.endsWith("package.json")
    )
      fs.cpSync(dir, path.join(TEMP_FOLDER, path.basename(dir)), {
        recursive: !path.basename(dir).includes("."),
      });
    else fs.renameSync(dir, path.join(TEMP_FOLDER, path.basename(dir)));
  });

  console.log(t("appBuildCommandExecuted"));

  execSync("yarn install", {
    cwd: TEMP_FOLDER,
    stdio: "inherit",
  });

  if (buildPlatform === "windows") {
    console.log(t("buildingWindowsExecutable"));

    execSync("yarn electron-builder --win", {
      cwd: TEMP_FOLDER,
      stdio: "inherit",
    });

    console.log(t("windowsBuildCompleted"));
  } else if (buildPlatform === "linux") {
    console.log(t("buildingLinuxPackage"));

    console.log(t("installingLinuxDependencies"));
    try {
      execSync(
        "sudo apt install -y build-essential fakeroot dpkg-dev libgtk-3-0 libnotify4 libnss3 libxss1 libxtst6 xdg-utils libatspi2.0-0 libuuid1 libsecret-1-0 libappindicator3-1 gnome-keyring libsecret-tools; sudo apt update -y; sudo apt upgrade -y",
        { stdio: "inherit" },
      );
    } catch (error) {
      console.log(t("someDependenciesInstalled"));
    }

    execSync("yarn electron-builder --linux deb", {
      cwd: TEMP_FOLDER,
      stdio: "inherit",
    });
    console.log("\n" + t("appPackagedSuccessfully"));
  }

  const extension = PLATFORM.isWindows ? ".exe" : ".deb";

  const pathDist = path.join(UTILITIES_FOR_PC_PATH, "dist-electron");
  const destinationPath = path.join(
    pathDist,
    `${dataBuild.appName}${extension}`,
  );

  if (!fs.existsSync(pathDist)) fs.mkdirSync(pathDist, { recursive: true });

  const dir = fs.readdirSync(dataBuild.distElectron);
  const appPackage = dir.find((file) => file.endsWith(extension));

  const sourcePath = path.join(dataBuild.distElectron, appPackage || "error");
  if (!fs.existsSync(sourcePath)) throw new Error(t("buildFailed"));

  if (fs.existsSync(destinationPath))
    fs.rmSync(destinationPath, { force: true });

  fs.renameSync(sourcePath, destinationPath);

  if (PLATFORM.isWindows) return;

  const installAnswer = ARGS.yes
    ? "y"
    : await ask(t("installDebPackagePrompt"), -1);
  if (installAnswer.toLowerCase() === "y") {
    execSync(
      `sudo dpkg -i ${destinationPath} && sudo apt-get install -f -y; sudo apt autoremove -y`,
      { stdio: "inherit" },
    );
    execSync("sudo ufw allow 5353/udp && sudo ufw reload");

    const runAppCommand = `/opt/${dataBuild.productName}/${dataBuild.appName} --no-sandbox --disable-gpu --ozone-platform=x11`;

    await addAutostartLinux();

    const answer = await ask(t("pleaseRestartComputer"), 10000);
    if (answer.toLowerCase() === "y") {
      console.log(t("restartNow"));
      execSync("sudo reboot", { stdio: "inherit" });
    } else {
      console.log(t("restartingComputer"));
    }

    const answer2 = await ask(t("openAppNow"), 60000);
    if (answer2.toLowerCase() === "y") {
      execSync(`${runAppCommand}`, {
        cwd: UTILITIES_FOR_PC_PATH,
        stdio: "inherit",
      });
    }
  }

  console.log(
    `\n${t("appPackagedSuccessMessage")} ${
      PLATFORM.isWindows ? t("appPackagedSuccessMessage") : ""
    }`,
  );
};

const run = async () => {
  if (PLATFORM.isWindows) {
    const isElevated = () => {
      try {
        execSync("net session", { stdio: "ignore" });
        return true;
      } catch {
        return false;
      }
    };

    if (!isElevated()) {
      const args = getArgs();
      const command = `cd ${UTILITIES_PATH}; yarn run build-app-electron ${args}; pause`;

      execSync(
        `powershell -NoProfile -ExecutionPolicy Bypass -Command "Start-Process PowerShell -Verb RunAs -ArgumentList '-NoProfile -ExecutionPolicy Bypass -Command ${command}'"`,
        { stdio: "inherit" },
      );
      process.exit(0);
    }
  }

  execSync("yarn run build-web-app-electron", {
    cwd: UTILITIES_PATH,
    stdio: "inherit",
  });
  console.log(t("webAppBuiltSuccessfully"));

  await buildApp();
};

handleExitFromScript(async (err) => {
  if (err) console.error("An error occurred:", err.message);
  if (!ARGS.yes) await ask(t("pressEnterToExit"), -1);
  removeDirSafe(TEMP_FOLDER);
});

run();
