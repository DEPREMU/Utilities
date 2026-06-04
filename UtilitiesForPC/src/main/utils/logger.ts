/* eslint-disable no-console */
import { app } from "electron";
import { exec } from "child_process";
import { getMessage } from "@common";
import dataApp, { Paths } from "./variables";

const write = (message: string) => {
  if (!dataApp || !app.isPackaged) return console.log(message);

  if (dataApp.getValue("isWindows")) {
    exec(`echo ${message.replace(/"/g, '\\"')} >> "${Paths.LOGS}"`, (e) => {
      if (e) console.error("Error writing log:", e.message);
    });
  } else {
    exec(
      `echo "${message.replace(
        /"/g,
        '\\"',
      )}" | sudo tee -a "${Paths.LOGS}" > /dev/null`,
      (e) => {
        if (e) console.error("Error writing log:", e.message);
      },
    );
  }
};

const writeLog = (message: string, level: "log" | "warn" | "error") => {
  if (!dataApp || !app.isPackaged) return console[level](message);

  const logEntry = `[${new Date().toLocaleString()}] [${level.toUpperCase()}]: ${message}`;
  write(logEntry);
};

/**
 * If an object is passed, it will be stringified. This allows for better logging of complex data structures.
 * If an Error object is passed, its message will be logged. This ensures that error details are captured effectively.
 * The log entry will include a timestamp and the log level (LOG, WARN, ERROR) for better traceability.
 * Logs are written to a file when the app is packaged, and to the console during development for easier debugging.
 * This method provides a consistent logging format across the application, making it easier to analyze logs and identify issues.
 */
export class Logger {
  static log = (...args: unknown[]) => writeLog(getMessage(...args), "log");

  static warn = (...args: unknown[]) => writeLog(getMessage(...args), "warn");

  static error = (...args: unknown[]) => writeLog(getMessage(...args), "error");
}

const initNewLogSession = () => {
  if (!dataApp || !app.isPackaged) return;

  const header = `\n\n--- New Session [${new Date().toISOString()}] ---\n\n`;
  write(header);
};
initNewLogSession();
