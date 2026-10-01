import chalk from "chalk";
import { Exec } from "./Exec";
import Readline from "readline";
import { Steps } from "./Steps";
import { Timers } from "@commonSrc/both";
import { Logger } from "@commonSrc/serverOrElectron/logger";
import { execSync } from "child_process";
import { Directory, File } from "@commonSrc/serverOrElectron/fs";

export class Script extends Steps {
  private static instance: Script | null = null;

  File = File;
  Exec = Exec;
  Directory = Directory;

  #onExitExecuted: boolean = false;
  #initializedOnExit: boolean = false;

  override stop = async (reason?: string, exitCode?: number) => {
    this.stopped = true;
    if (this.abortController) this.abortController.abort(reason);

    if (reason) Logger.log(chalk.red(reason));
    process.exit(exitCode ?? 0);
  };

  override run = Object.assign(
    async (stopOnError: boolean = true) => {
      while (this.stepFunctions.length > 0 && !this.stopped) {
        const item = this.stepFunctions.shift();
        if (!item) break;

        await this.executeFunction(item, stopOnError);
      }

      return this;
    },
    {
      executeStep: async (index: number, stopOnError: boolean = true) => {
        const item = this.stepFunctions[index];
        if (!item) throw new Error(`Step not found: ${index}`);

        return await this.executeFunction(item, stopOnError);
      },
    },
  );

  private handleExitFromScript(
    fun: (err?: Error) => Promise<void> | void,
  ): Script {
    if (this.#initializedOnExit) return this;
    this.#initializedOnExit = true;

    const wrappedFun = async (err?: Error) => {
      if (this.#onExitExecuted) return;
      this.stopped = true;
      this.#onExitExecuted = true;

      this.stop(err?.message, err ? 1 : 0);

      if (!(err instanceof Error)) err = undefined;

      try {
        await fun(err);
      } catch (error) {
        // eslint-disable-next-line no-console
        console.error("Error in exit handler", error);
      } finally {
        process.exit(err ? 1 : 0);
      }
    };

    process.once("exit", wrappedFun);
    process.once("SIGINT", wrappedFun);
    process.once("SIGTERM", wrappedFun);
    process.once("beforeExit", wrappedFun);
    process.once("uncaughtException", wrappedFun);
    process.once("unhandledRejection", wrappedFun);

    return this;
  }

  public onExit(fun: (err?: Error) => Promise<void> | void) {
    this.handleExitFromScript(fun);
    return this;
  }

  public async ask(question: string, timeout = 5000): Promise<string> {
    const rl = Readline.createInterface({
      input: process.stdin,
      output: process.stdout,
    });

    return await new Promise<string>((resolve) => {
      let id: ReturnType<typeof Timers.setTimeout>;
      if (timeout > 0)
        id = Timers.setTimeout(() => {
          rl?.close?.();
          resolve("");
        }, timeout);

      rl.question(question, (answer) => {
        rl.close();
        if (timeout > 0) Timers.clearTimeout(id);
        resolve(answer);
      });
    });
  }

  public elevate(command: string): boolean {
    if (!this.PLATFORM.isWindows) return true;

    const isElevated = () => {
      try {
        execSync("net session", { stdio: "ignore" });
        return true;
      } catch {
        return false;
      }
    };
    if (isElevated()) return true;

    execSync(
      `powershell -NoProfile -ExecutionPolicy Bypass -Command "Start-Process PowerShell -Verb RunAs -ArgumentList '-NoProfile -ExecutionPolicy Bypass -Command ${command}'"`,
      { stdio: "inherit" },
    );

    process.exit(0);
  }

  constructor(onExit?: Parameters<Script["handleExitFromScript"]>[0]) {
    if (Script.instance) return Script.instance;

    super();
    Script.instance = this;

    if (onExit) this.handleExitFromScript(onExit);
  }
}
