import fs from "fs";
import path from "path";
import dataApp from "./variables";
import { execSync } from "child_process";
import { handleShutdown } from "./server";
import { app, dialog, powerMonitor } from "electron";
import { initNewLogSession, writeLog } from "./logger";

powerMonitor.on("resume", () => {
  dataApp.setValue("wasSleeping", true);
});

powerMonitor.on("unlock-screen", () => {
  if (!dataApp.getValue("wasSleeping")) return;

  writeLog("Restarting whole Electron app due to screen unlock...", "warn");
  app.relaunch();
  handleShutdown();
});

const elevatePrivileges = (): void => {
  if (dataApp.getValue("isWindows")) return;

  try {
    execSync("sudo -n true");
    dataApp.setValue("hasSudo", true);
    writeLog("Privilegios de administrador verificados.", "info");
  } catch {
    const command = `pkexec /opt/UtilitiesForPC/utilities-for-pc ${process.argv
      .filter((arg) => arg.includes("--"))
      .join(" ")}`;

    writeLog(`Elevating privileges... ${command}`, "info");

    try {
      execSync(command);
      writeLog("Elevating privileges...", "info");
    } catch (error) {
      writeLog(
        "Failed to elevate privileges (or user cancelled): " +
          JSON.stringify(error),
        "error",
      );
      console.error("Error elevating privileges:", error);
    }

    app.quit();
    process.exit(0);
  }
};

const ASSETS = app.isPackaged
  ? path.join(process.resourcesPath, "assets")
  : path.join(path.dirname(__dirname), "assets");

const BUILD = app.isPackaged
  ? path.join(process.resourcesPath, "app.asar", "build")
  : path.join(path.dirname(__dirname), "build");

const DIST = app.isPackaged
  ? path.join(process.resourcesPath, "dist")
  : path.join(path.dirname(__dirname), "dist");

export const PATHS = {
  DIST,
  BUILD,
  ASSETS,
} as const;

export const getPath = (
  key: keyof typeof PATHS,
  ...segments: string[]
): string => {
  return path.join(PATHS[key], ...segments);
};

export const getJSPath = (): string => {
  const pathWeb = path.join(
    app.isPackaged ? process.resourcesPath : path.dirname(__dirname),
    "dist",
    "_expo",
    "static",
    "js",
    "web",
  );

  if (!fs.existsSync(pathWeb))
    throw new Error(`JS path does not exist: ${pathWeb}`);

  const dirFiles = fs.readdirSync(pathWeb);
  const jsFile = dirFiles.find((file) => file.endsWith(".js"));

  if (!jsFile) throw new Error(`JS file not found in directory ${pathWeb}`);

  return pathWeb;
};

export const askPath = async (): Promise<string | null> => {
  try {
    const mainWindow = dataApp.getValue("mainWindow");
    if (!mainWindow) return null;

    const result = await dialog.showOpenDialog(mainWindow, {
      properties: ["openFile", "dontAddToRecent"],
    });
    if (result.canceled) return null;
    if (!result.filePaths.length) return null;

    return result.filePaths[0].split("/").slice(0, -1).join("/");
  } catch (error) {
    writeLog("Error asking path: " + String(error), "error");
    return null;
  }
};

initNewLogSession();
elevatePrivileges();

export * from "./expose";
export * from "./logger";
export * from "./server";
export * from "./storage";
export * from "./variables";
export * from "./translations";
export * from "./memoryMonitor";
export * from "./notifications";
export * from "./nativeData/index";

export default dataApp;
