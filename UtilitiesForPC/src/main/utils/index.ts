import dataApp from "./vars/variables";
import { exec } from "child_process";
import { Timers } from "@common";
import { Logger } from "./logger";
import { handleShutdown } from "./server";
import { app, powerMonitor } from "electron";

const logger = new Logger("Main");

powerMonitor.on("resume", () => {
  dataApp.setValue("wasSleeping", true);
});

powerMonitor.on("unlock-screen", () => {
  if (!dataApp.getValue("wasSleeping")) return;

  logger.warn("Restarting whole Electron app due to screen unlock...");
  app.relaunch();
  handleShutdown();
});

const elevatePrivileges = (): void => {
  if (dataApp.getValue("isWindows")) return;

  exec("sudo -n true", (error) => {
    if (!error) {
      dataApp.setValue("hasSudo", true);
    }

    logger.warn(
      "User does not have sudo privileges or sudo session has expired.",
    );

    const command = `pkexec /opt/UtilitiesForPC/utilities-for-pc ${process.argv
      .filter((arg) => arg.includes("--"))
      .join(" ")}`;

    logger.log(`Elevating privileges... ${command}`);

    exec(command, (e) => {
      Timers.setTimeout(() => {
        app.quit();
        process.exit(0);
      }, 1000);

      if (!e) {
        dataApp.setValue("hasSudo", true);

        return;
      }
      logger.error(
        "Failed to elevate privileges (or user cancelled):",
        e.message,
      );
    });
  });
  logger.log("Privilegios de administrador verificados.");
};
elevatePrivileges();

export * from "./vars";
export * from "./expose";
export * from "./logger";
export * from "./server";
export * from "./storage";
export * from "./translations";
export * from "./notifications";
export * from "./nativeData/index";

export default dataApp;
