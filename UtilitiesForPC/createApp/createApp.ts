/**
 * This script builds the Electron app for Windows and Linux.
 * It first builds the web version of the app, then packages it using Electron Builder.
 * Make sure to run this script in an environment where you have the necessary permissions.
 * Requires Node.js and npm to be installed.
 * Run this script from the root directory Utilities/ where the UtilitiesForPC folder is located, or from the UtilitiesForPC directory.
 * Usage: `node createApp.js` or `node UtilitiesForPC/createApp.js`
 *
 * Platform-specific builds:
 * - Linux → Linux: Native build
 * - Windows → Windows: Native build
 * - Linux → Windows: Requires Wine (install: sudo dpkg --add-architecture i386 && sudo apt update && sudo apt install wine64 wine32)
 * - Windows → Linux: Requires WSL with dpkg-dev installed
 *
 * @example
 * npm run build-app -- --platform=both  # Build for both platforms (requires Wine on Linux)
 * npm run build-app -- --platform=linux  # Build only for Linux
 * npm run build-app -- --platform=windows  # Build only for Windows
 */

import fs from "fs";
import os from "os";
import path from "path";
import { t } from "./translations.ts";
import { execSync } from "child_process";
import * as readline from "readline";
import type PACKAGE_JSON from "../package.json";

const args = process.argv.slice(2);

type BuildPlatform = "linux" | "windows" | "both";

const askQuestion = async (question: string): Promise<string> => {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });
  const answer = await new Promise((resolve: (value: string) => void) => {
    rl.question(question, resolve);
  });
  rl.close();
  return answer;
};

let __dirname = path.resolve("../");
if (!__dirname.endsWith("UtilitiesForPC")) {
  __dirname = path.resolve(__dirname, "UtilitiesForPC");
}
if (!fs.existsSync(__dirname))
  throw new Error("__dirname does not exist: " + __dirname);

const packageJson: typeof PACKAGE_JSON = JSON.parse(
  fs.readFileSync(path.resolve(__dirname, "package.json"), "utf-8")
) as typeof PACKAGE_JSON;
const isWindows = os.platform() === "win32";
const isLinux = os.platform() === "linux";

const dataBuild = {
  distElectron: packageJson.build.directories.output,
  appName: packageJson.name,
  productName: packageJson.build.productName,
} as const;

/**
 * Checks if Wine is installed on Linux (required for Windows builds from Linux)
 */
const checkWineInstalled = (): boolean => {
  if (!isLinux) return true;

  try {
    execSync("wine --version", { stdio: "ignore" });
    return true;
  } catch {
    return false;
  }
};

/**
 * Installs Wine on Linux for cross-platform Windows builds
 */
const installWine = async (): Promise<void> => {
  console.log(t("wineRequired"));
  console.log(t("wineDescription"));

  const answer = await askQuestion(t("installWinePrompt"));

  if (answer.toLowerCase() !== "y") {
    console.log(t("skipWineInstallation"));
    console.log(t("installWineManually"));
    throw new Error(t("wineNotInstalled"));
  }

  console.log(t("installingWine"));
  try {
    execSync(
      "sudo dpkg --add-architecture i386 && sudo apt update && sudo apt install -y wine64 wine32",
      { stdio: "inherit" }
    );
    console.log(t("wineInstalledSuccessfully"));
  } catch (error) {
    throw new Error(t("failedToInstallWine"));
  }
};

const addAutostartLinux = async (runAppCommand: string) => {
  const answer0 = await askQuestion(t("enableAutoStartQuestion"));
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
      `utilities-for-pc-root-${Date.now()}.sh`
    );
    fs.writeFileSync(tempWrapper, wrapperScriptContent);
    execSync(`sudo mv ${tempWrapper} ${wrapperScriptPath}`);
    execSync(`sudo chmod +x ${wrapperScriptPath}`);

    execSync(
      `sudo sh -c 'echo "${sudoersEntry}" > /etc/sudoers.d/${fileSudoers}'`
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
  console.log(t("buildingApp"));
  execSync("npm run build", { cwd: __dirname });
  console.log(t("appBuildCommandExecuted"));

  let buildPlatform: BuildPlatform = "both";

  const platformArg = args.find(
    (arg) => arg.startsWith("--platform=") || arg.startsWith("-p=")
  );
  if (platformArg) {
    const platform = platformArg.split("=")[1] as BuildPlatform;
    if (["linux", "windows", "both"].includes(platform)) {
      buildPlatform = platform;
    }
  } else {
    buildPlatform = isWindows ? "windows" : "linux";
  }

  console.log(t("elevatingPermissions"));

  if (buildPlatform === "both") {
    console.log(t("buildingBothPlatforms"));

    if (isLinux && !checkWineInstalled()) await installWine();

    console.log(t("buildingWindowsAndLinux"));
    try {
      execSync("npx electron-builder --win --linux deb", {
        cwd: __dirname,
        stdio: "inherit",
      });
      console.log(t("bothBuildsCompleted"));
    } catch (error) {
      console.error(t("buildFailed"));
      if (isLinux) {
        console.error(t("wineNotWorking"));
        console.error(t("wineInstallCommand"));
      }
      throw error;
    }
  } else if (buildPlatform === "windows") {
    console.log(t("buildingWindowsExecutable"));

    if (isLinux) {
      const hasWine = checkWineInstalled();
      if (!hasWine) {
        console.log(t("buildingWindowsFromLinuxRequiresWine"));
        await installWine();
      }
    }

    try {
      execSync("npx electron-builder --win", {
        cwd: __dirname,
        stdio: "inherit",
      });
      console.log(t("windowsBuildCompleted"));
    } catch (error) {
      if (isLinux) {
        console.error(t("windowsBuildFailed"));
        console.error(t("wineRequiredForWindows"));
      }
      throw error;
    }
  } else if (buildPlatform === "linux") {
    if (isWindows) {
      console.log(t("buildingLinuxPackageFromWindows"));
    }

    console.log(t("buildingLinuxPackage"));

    if (isLinux) {
      console.log(t("installingLinuxDependencies"));
      try {
        execSync(
          "sudo apt install -y build-essential fakeroot dpkg-dev libgtk-3-0 libnotify4 libnss3 libxss1 libxtst6 xdg-utils libatspi2.0-0 libuuid1 libsecret-1-0 libappindicator3-1 gnome-keyring libsecret-tools; sudo apt update -y; sudo apt upgrade -y",
          { stdio: "inherit" }
        );
      } catch (error) {
        console.log(t("someDependenciesInstalled"));
      }
    }

    try {
      execSync("npx electron-builder --linux deb", {
        cwd: __dirname,
        stdio: "inherit",
      });
      console.log("\n" + t("appPackagedSuccessfully"));
    } catch (error) {
      if (isWindows) {
        console.error(t("linuxBuildFromWindowsRequiresWSL"));
        console.error(t("installWSLInstructions"));
      }
      throw error;
    }

    if (isLinux) {
      const dir = execSync(`ls`, { cwd: dataBuild.distElectron })
        .toString()
        .split("\n");
      const packageName = dir.find((file) => file.endsWith(".deb"));
      if (!packageName) throw new Error(t("FailedToFindSnapPackage"));

      const installAnswer = await askQuestion(t("installDebPackagePrompt"));
      if (installAnswer.toLowerCase() === "y") {
        execSync(
          `sudo dpkg -i ${path.join(
            dataBuild.distElectron,
            packageName
          )} && sudo apt-get install -f -y; sudo apt autoremove -y`,
          {
            cwd: __dirname,
            stdio: "inherit",
          }
        );

        const runAppCommand = `/opt/${dataBuild.productName}/${dataBuild.appName} --no-sandbox --disable-gpu --ozone-platform=x11`;

        await addAutostartLinux(runAppCommand);

        const answer = await askQuestion(t("pleaseRestartComputer"));
        if (answer.toLowerCase() === "y") {
          console.log(t("restartNow"));
          execSync("sudo reboot", { stdio: "inherit" });
        } else {
          console.log(t("restartingComputer"));
        }

        const answer2 = await askQuestion(t("openAppNow"));
        if (answer2.toLowerCase() === "y") {
          execSync(`${runAppCommand}`, { cwd: __dirname, stdio: "inherit" });
        }
      }
    }
  }

  console.log(
    `\n${t("appPackagedSuccessMessage")} ${
      isWindows ? t("appPackagedSuccessMessage") : ""
    }`
  );
};

const exportWebApp = () => {
  const appPath = path.resolve(__dirname, "..", "app");
  if (!fs.existsSync(appPath))
    throw new Error(t("appPathDoesNotExist") + appPath);

  console.log(t("installingDependencies"));
  execSync("npm install", { cwd: appPath });
  console.log(t("dependenciesInstalled"));

  console.log(t("buildingWebApp"));
  const data = execSync("npm run build:web", { cwd: appPath });
  if (!data.toString().includes("Exported: dist"))
    throw new Error(t("failedToBuildWebApp") + data.toString());
  console.log(t("webAppBuiltSuccessfully"));

  console.log(t("cleaningUpOldBuildDirectories"));
  ["dist", dataBuild.distElectron, "release", "build"].forEach((dir) => {
    try {
      const fullPath = path.resolve(__dirname, dir);
      if (fs.existsSync(fullPath)) fs.rmSync(fullPath, { recursive: true });
    } catch {}
  });
  console.log(t("oldBuildDirectoriesCleaned"));

  console.log(t("preparingFilesForElectronApp"));
  const distPath = path.resolve(appPath, "dist");
  const distPathToCopy = path.resolve(__dirname, "dist");
  fs.cpSync(distPath, distPathToCopy, { recursive: true });
  fs.rmSync(distPath, { recursive: true });

  console.log(t("copyingAssets"));
  ["ico", "png"].forEach((ext) => {
    fs.copyFileSync(
      path.resolve(__dirname, "assets", `tray-icon.${ext}`),
      path.resolve(__dirname, "dist", "assets", `tray-icon.${ext}`)
    );
  });
  console.log(t("assetsCopied"));

  console.log(t("inliningJSAndFontsIntoHTML"));
  const jsPath = path.resolve(
    __dirname,
    "dist",
    "_expo",
    "static",
    "js",
    "web"
  );
  if (!fs.existsSync(jsPath))
    throw new Error(t("failedToFindJSBundle") + jsPath);

  const files = fs.readdirSync(jsPath);
  const mainFile = files.find((file) => file.endsWith(".js"));

  if (!mainFile) throw new Error(t("failedToFindMainJSBundle") + jsPath);

  const mainFilePath = path.resolve(jsPath, mainFile);
  const mainFileContent = fs.readFileSync(mainFilePath, "utf-8");

  let html = fs.readFileSync(
    path.resolve(__dirname, "dist", "index.html"),
    "utf-8"
  );
  const fontsPath = path.resolve(__dirname, "dist", "assets", "fonts");

  if (!fs.existsSync(fontsPath))
    fs.mkdirSync(fontsPath, {
      recursive: true,
    });

  const MaterialCommunityIcons = path.resolve(
    appPath,
    "node_modules",
    "react-native-vector-icons",
    "Fonts",
    "MaterialCommunityIcons.ttf"
  );
  if (fs.existsSync(MaterialCommunityIcons))
    fs.copyFileSync(
      MaterialCommunityIcons,
      path.resolve(fontsPath, "MaterialCommunityIcons.ttf")
    );

  html = html.replace(/<script[^*]+<\/script>/g, () => {
    return `<script defer>\n${mainFileContent}\n</script>`;
  });
  html = html.replace(/@font-face[^`]+/g, (match) => {
    return match.replace(
      /url\([^\)]+\)/g,
      'url("./assets/fonts/MaterialCommunityIcons.ttf") format("truetype")'
    );
  });
  fs.writeFileSync(path.resolve(__dirname, "dist", "index.html"), html);
  console.log(t("jsAndFontsInlined"));

  if (!args.includes("export-web")) buildApp();
};

exportWebApp();
