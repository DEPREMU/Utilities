import { app } from "electron";
import dataApp from "./variables";
import { execSync } from "child_process";

export const initNewLogSession = () => {
  try {
    const header = `\n\n--- New Session [${new Date().toISOString()}] ---\n\n`;
    let command = "";
    if (dataApp.getValue("isWindows")) {
      command = `echo "${header.replace(/"/g, '\\"')}" >> "${dataApp.getValue(
        "logPath"
      )}"`;
    } else {
      command = `echo "${header.replace(
        /"/g,
        '\\"'
      )}" | sudo tee -a "${dataApp.getValue("logPath")}" > /dev/null`;
    }
    execSync(command);
  } catch (error) {
    console.error("Error initializing log:", error);
  }
};

export const writeLog = (message: string, level: "info" | "warn" | "error") => {
  if (!dataApp || !app.isPackaged)
    return console[level === "info" ? "log" : level](message);

  try {
    const logEntry = `[${new Date().toLocaleString()}] [${level.toUpperCase()}]: ${message}`;
    if (dataApp.getValue("isWindows")) {
      execSync(
        `echo ${logEntry.replace(/"/g, '\\"')} >> "${dataApp.getValue(
          "logPath"
        )}"`
      );
    } else {
      execSync(
        `echo "${logEntry.replace(
          /"/g,
          '\\"'
        )}" | sudo tee -a "${dataApp.getValue("logPath")}" > /dev/null`
      );
    }
  } catch (error) {
    console.error("Error writing log:", error);
  }
};
