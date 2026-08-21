import {
  env,
  args,
  APP_PATH,
  PLATFORM,
  TYPE_ARGS,
  FRONTEND_PATH,
  handleExitFromScript,
  UTILITIES_FOR_PC_PATH,
} from "../config.ts";
import axios from "axios";
import chalk from "chalk";
import { Helper } from "@commonSrc/both/index.ts";
import { Logger } from "@commonSrc/serverOrElectron/logger.ts";
import * as readline from "readline";
import { spawn, execSync, ChildProcess, SpawnOptions } from "child_process";

const values = {
  PLATFORM: "web",
  platform: "linux",
  TYPE_BUILD: "test",
  BUILD_PROFILE: "development",
} as const satisfies Partial<TYPE_ARGS>;

for (const [key, value] of Helper.Object.entries(values)) {
  env[key as never] = value;
  process.env[key] = value;
  args.editArg(key, value as never);
}

interface ProcessState {
  expo: ChildProcess | null;
  electron: ChildProcess | null;
  frontend: ChildProcess | null;
  isRestarting: boolean;
}

const state: ProcessState = {
  expo: null,
  electron: null,
  frontend: null,
  isRestarting: false,
};

const spawnCommand = (
  command: string,
  argsList: string[],
  options: SpawnOptions,
): ChildProcess => {
  return spawn(command, argsList, {
    ...options,
    shell: PLATFORM.isWindows,
    stdio: options.stdio ?? ["ignore", "inherit", "inherit"],
  });
};

const runBuildCommand = (command: string): void => {
  try {
    Logger.log(chalk.cyan(`[Build] Executing: ${command}`));
    execSync(command, {
      env,
      stdio: "inherit",
    });
  } catch (error) {
    Logger.error(chalk.red("[Build Error] Command failed:"), error);
  }
};

const killElectron = async (): Promise<void> => {
  try {
    if (!state.electron) return;

    const res = await axios.get("http://localhost:9090/close-app", {
      timeout: 5000,
    });
    if (!res.data?.success)
      Logger.error(chalk.red("Failed to close Electron app"));

    state.electron = null;
  } catch {
    // Ignore errors
  }
};

const killProcess = (
  process: ChildProcess | null,
  name: string,
): Promise<void> => {
  return new Promise((resolve) => {
    if (!process || process.killed || !!process.exitCode) {
      resolve();
      return;
    }

    Logger.log(chalk.red(`[Manager] Force killing ${name}...`));

    if (PLATFORM.isWindows && process.pid) {
      const killer = spawn("taskkill", ["/PID", `${process.pid}`, "/T", "/F"], {
        stdio: "ignore",
      });
      killer.once("close", () => resolve());
      return;
    }

    process.once("close", () => resolve());
    process.kill("SIGKILL");
  });
};

const startElectron = async (): Promise<ChildProcess> => {
  runBuildCommand(`yarn run build-resources-electron ${args.getArgs()}`);

  await killElectron();

  Logger.log(chalk.green("[Electron] Starting..."));

  const electronEnv = { ...env };

  const child = spawnCommand(
    "electron",
    [".", "--expose-gc", "--no-sandbox", "--ozone-platform=x11"],
    {
      cwd: UTILITIES_FOR_PC_PATH,
      env: electronEnv,
      killSignal: "SIGKILL",
    },
  );

  child.on("close", (code) => {
    if (!state.isRestarting && !!code) {
      Logger.log(chalk.red(`[Electron] Exited with code ${code}`));
    }
    child.removeAllListeners();
  });

  return child;
};

const startExpo = (): ChildProcess => {
  Logger.log(chalk.green("[Expo] Starting..."));

  const expoEnv = { ...env };

  return spawnCommand("yarn", ["expo", "start", "-c"], {
    env: expoEnv,
    cwd: APP_PATH,
  });
};

const startFrontend = (): ChildProcess => {
  Logger.log(chalk.green("[Frontend] Starting..."));

  const frontendEnv = { ...env };

  return spawnCommand("yarn", ["run", "dev"], {
    env: frontendEnv,
    cwd: FRONTEND_PATH,
    stdio: ["ignore", "inherit", "inherit"],
  });
};

const performRestart = async () => {
  if (state.isRestarting) return;
  state.isRestarting = true;

  try {
    Logger.log(chalk.yellow("[Manager] Restarting Electron..."));
    state.electron = await startElectron();
  } catch (error) {
    Logger.error("Error during restart:", (error as Error).message);
  } finally {
    state.isRestarting = false;
  }
};

const performExit = async () => {
  Logger.log(chalk.yellow("\n[Manager] Shutting down all processes..."));

  try {
    process.stdin.setRawMode(false);
    process.stdin.removeAllListeners();
  } catch {
    // Ignore errors here
  }

  await Promise.allSettled(
    Object.entries(state).map(([name, process]) =>
      process ? killProcess(process, name) : Promise.resolve(),
    ),
  );

  Logger.log(chalk.green("[Manager] Goodbye."));
  process.exit(0);
};

const options = () => {
  Logger.log(
    chalk.cyan("\n---------------------------------------------------------"),
    chalk.bold("\nKEYBOARD CONTROLS:"),
    chalk.blue("\n[r] Restart Electron (rebuilds resources)"),
    chalk.red("\n[q] Quit all processes"),
    chalk.red("\n[h] Show this message again"),
    chalk.cyan("\n---------------------------------------------------------"),
  );
};

const run = async () => {
  Logger.log(
    chalk.yellow(
      `[stdin] isTTY=${process.stdin.isTTY}, isRaw=${process.stdin.isRaw}`,
    ),
  );

  if (!process.stdin.isTTY) {
    Logger.error(
      chalk.red("[Manager] stdin is not a TTY; keyboard controls disabled."),
    );
    return;
  }

  state.expo = startExpo();
  state.frontend = startFrontend();
  state.electron = await startElectron();

  options();

  readline.emitKeypressEvents(process.stdin);
  process.stdin.setRawMode(true);
  process.stdin.resume();

  process.stdin.on("keypress", async (str, key) => {
    Logger.log(
      chalk.magenta(`[Keyboard] ${JSON.stringify(str)} ${JSON.stringify(key)}`),
    );

    if (key.ctrl && key.name === "c") return await performExit();

    switch (key.name) {
      case "q":
        return await performExit();
      case "r":
        return await performRestart();
      case "h":
        return options();
    }
  });
};

handleExitFromScript(performExit);

run();
