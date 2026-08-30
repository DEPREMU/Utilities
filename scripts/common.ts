import {
  File,
  Directory,
  getAllPathsSync,
} from "@commonSrc/serverOrElectron/fs";
import path from "path";
import chalk from "chalk";
import Readline from "readline";
import { Timers } from "@commonSrc/both";
import { Logger } from "@commonSrc/serverOrElectron/logger";
import { Function } from "@types";
import { promisify } from "util";
import humanizeDuration from "humanize-duration";
import { exec, ExecOptions, execSync } from "child_process";

type StepFunctionType = Function<
  [instance: Script, abortController: AbortController],
  void | Promise<void>
>;

type JsonPackageShape = {
  app: typeof import("../app/package.json");
  root: typeof import("../package.json");
  types: typeof import("../types/package.json");
  server: typeof import("../server/package.json");
  common: typeof import("../common/package.json");
  frontend: typeof import("../frontend/package.json");
  utilitiesForPC: typeof import("../UtilitiesForPC/package.json");
};

class Data {
  private data = {} as Record<string, unknown>;
  private packagesJson: Partial<JsonPackageShape> = {};

  public addValue(key: string, value: unknown): Script {
    this.data[key] = value;

    return this as unknown as Script;
  }

  public getValue<K>(key: string): K | undefined {
    return (this.data[key] as K) ?? undefined;
  }

  getPackageJson = async <T extends keyof JsonPackageShape>(
    key: T,
  ): Promise<JsonPackageShape[T]> => {
    let packageJSON = this.packagesJson[key];
    if (packageJSON) return packageJSON;

    packageJSON = JSON.parse(
      await new File(path.join(this.PATHS[key], "package.json")).readFile(),
    );

    this.packagesJson[key] = packageJSON;
    return packageJSON as JsonPackageShape[T];
  };

  readonly PLATFORM = {
    isLinux: process.platform === "linux",
    isWindows: process.platform === "win32",
  };

  readonly PATHS = getAllPathsSync();
}

abstract class Steps extends Data {
  protected stopped = false;

  protected abortController: AbortController | null = null;

  protected stepFunctions: { label: string; func: StepFunctionType }[] = [];

  protected executeFunction = async (
    item: (typeof this.stepFunctions)[0],
    stopOnError: boolean,
  ) => {
    const { label, func } = item;

    try {
      Logger.log(chalk.cyan(`Executing: "${label}"`));

      if (!this.abortController) this.abortController = new AbortController();

      const t = Date.now();
      await func(this as never, this.abortController);

      Logger.log(
        chalk.green(
          `Completed: "${label}" on ${humanizeDuration(Date.now() - t, {
            units: ["h", "m", "s"],
            largest: 2,
          })}`,
        ),
      );
    } catch (error) {
      Logger.error(chalk.red(`Error in step: "${label}".`), error);
      if (stopOnError) throw error;
    } finally {
      this.abortController = null;
    }
  };

  public addStep(label: string, func: StepFunctionType) {
    this.stepFunctions.push({ label, func });

    return this as unknown as Script;
  }

  public abstract run: ((stopOnError: boolean) => Promise<Script>) & {
    executeStep: (index: number, stopOnError: boolean) => Promise<void>;
  };

  public abstract stop: (reason?: string, exitCode?: number) => void;
}

const execAsync = promisify(exec);

class Exec {
  private onData: Set<(chunk: string) => void> = new Set();
  private onErrorData: Set<(chunk: string) => void> = new Set();

  private emitData = (chunk: string) =>
    this.onData.forEach((fun) => fun(chunk));
  private emitErrorData = (chunk: string) =>
    this.onErrorData.forEach((fun) => fun(chunk));

  public async = Object.assign(execAsync, {
    onData: (fun: (chunk: string) => void) => {
      this.onData.add(fun);
      return this.async;
    },
    onErrorData: (fun: (chunk: string) => void) => {
      this.onErrorData.add(fun);
      return this.async;
    },
    run: (command: string, options?: ExecOptions) => {
      const child = exec(command, options);

      return new Promise<number | Error>((resolve, reject) => {
        child.stdout?.on("data", (chunk: Buffer) => {
          this.emitData(chunk.toString());
        });

        child.stderr?.on("data", (chunk: Buffer) => {
          this.emitErrorData(chunk.toString());
        });

        child.on("error", reject);

        child.on("close", (code) => {
          if (code === null) return reject();
          return code === 0 ? resolve(code) : reject(code);
        });
      });
    },
  });
}

export class Script extends Steps {
  private static instance: Script | null = null;

  File = File;
  Exec = Exec;
  Directory = Directory;

  #onExitExecuted: boolean = false;
  #initializedOnExit: boolean = false;

  override stop = Object.assign(async (reason?: string, exitCode?: number) => {
    this.stopped = true;
    if (this.abortController) this.abortController.abort(reason);

    if (reason) Logger.log(chalk.red(reason));
    process.exit(exitCode ?? 0);
  });

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

  public elevate(command: string) {
    if (!this.PLATFORM.isWindows) return;

    const isElevated = () => {
      try {
        execSync("net session", { stdio: "ignore" });
        return true;
      } catch {
        return false;
      }
    };
    if (isElevated()) return;

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
