import dataApp from "./variables";
import { execSync } from "child_process";
import { handleShutdown } from "./server";
import { app, powerMonitor } from "electron";
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
        "error"
      );
      console.error("Error elevating privileges:", error);
    }

    app.quit();
    process.exit(0);
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
