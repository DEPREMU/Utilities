/* eslint-disable no-console */
import { app } from "electron";
import dataApp from "./vars/variables";
import { Paths } from "./vars/paths";
import { spawn } from "child_process";
import { ExecuteOnce, File, Helper } from "@common";

const MAX_MESSAGES = 20;

abstract class Logs {
  protected file = new File(Paths.LOGS);
  protected messages: string[] = [];

  protected abstract write(message: string): void;

  constructor() {
    ExecuteOnce.execute("InitLogs", undefined, () => {
      const header = `\n\n--- New Session [${new Date().toISOString()}] ---\n\n`;
      this.write(header);
    });
  }
}

/**
 * If an object is passed, it will be stringified. This allows for better logging of complex data structures.
 * If an Error object is passed, its message will be logged. This ensures that error details are captured effectively.
 * The log entry will include a timestamp and the log level (LOG, WARN, ERROR) for better traceability.
 * Logs are written to a file when the app is packaged, and to the console during development for easier debugging.
 * This method provides a consistent logging format across the application, making it easier to analyze logs and identify issues.
 */
export class Logger extends Logs {
  #moduleName: string;

  protected getLogMsg(
    level: "log" | "warn" | "error",
    ...args: unknown[]
  ): string {
    return `[${new Date().toLocaleString()}]-[${this.#moduleName}]-[${level.toUpperCase()}]: ${Helper.getMessage(
      ...args,
    )}`;
  }

  protected override write(message: string) {
    if (!dataApp || !app.isPackaged) return console.log(message);

    this.file.writeFile(message, { mode: "a" }).then((success) => {
      if (success) return;

      if (dataApp.getValue("isWindows")) {
        const ps = spawn(
          "powershell.exe",
          [
            "-NoProfile",
            "-Command",
            `
            $input | Add-Content -Path $env:LOG_PATH
            `,
          ],
          {
            env: {
              ...process.env,
              LOG_PATH: Paths.LOGS,
            },
          },
        );

        ps.stdin.end(message);
      } else {
        const tee = spawn("sudo", ["tee", "-a", Paths.LOGS], {
          stdio: ["pipe", "ignore", "inherit"],
        });

        tee.stdin.end(message + "\n");
      }
    });
  }

  protected writeLog(level: "log" | "warn" | "error", ...args: unknown[]) {
    const msg = this.getLogMsg(level, ...args);
    if (!dataApp || !app.isPackaged) return console[level](msg);

    this.messages.push(msg);

    if (this.messages.length < MAX_MESSAGES) return;

    this.write(this.messages.join("\n"));
    this.messages = [];
  }

  public log(...args: unknown[]) {
    this.writeLog("log", ...args);
  }

  public warn(...args: unknown[]) {
    this.writeLog("warn", ...args);
  }

  public error(...args: unknown[]) {
    this.writeLog("error", ...args);
  }

  public clear() {
    this.messages = [];
    this.file.writeFile("", { mode: "w" });
  }

  constructor(moduleName: string) {
    super();
    this.#moduleName = moduleName;

    console.log(`Loaded module: ${this.#moduleName}`);
  }
}
