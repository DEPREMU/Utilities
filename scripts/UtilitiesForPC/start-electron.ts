import {
  spawn,
  execSync,
  type ChildProcess,
  type SpawnOptionsWithoutStdio,
} from "child_process";
import {
  env,
  args,
  APP_PATH,
  PLATFORM,
  UTILITIES_FOR_PC_PATH,
} from "../config.ts";
import axios from "axios";
import { Logger } from "@commonSrc/serverOrElectron/logger.ts";
import * as readline from "readline";

const values = {
  PLATFORM: "web",
  BUILD_PROFILE: "development",
} as const;

for (const [key, value] of Object.entries(values)) {
  env[key] = value;
  process.env[key] = value;
  (args.ARGS as Record<string, unknown>)[key] = value as never;
}

interface ProcessState {
  expo: ChildProcess | null;
  electron: ChildProcess | null;
  isRestarting: boolean;
}

const state: ProcessState = {
  expo: null,
  electron: null,
  isRestarting: false,
};

const spawnCommand = (
  command: string,
  argsList: string[],
  options: SpawnOptionsWithoutStdio,
): ChildProcess => {
  return spawn(command, argsList, {
    ...options,
    shell: PLATFORM.isWindows,
    stdio: "inherit",
  });
};

const runBuildCommand = (command: string): void => {
  try {
    Logger.log(`\x1b[36m[Build]\x1b[0m Executing: ${command}`);
    execSync(command, {
      env,
      stdio: "inherit",
    });
  } catch (error) {
    Logger.error("\x1b[31m[Build Error]\x1b[0m Command failed:", error);
  }
};

const killElectron = async (): Promise<void> => {
  try {
    if (!state.electron) return;

    const res = await axios.get("http://localhost:9090/close-app", {
      timeout: 5000,
    });
    if (!res.data?.success) Logger.error("Failed to close Electron app");

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

    Logger.log(`\x1b[33m[Manager]\x1b[0m Stopping ${name}...`);

    if (PLATFORM.isWindows && process.pid) {
      const killer = spawn("taskkill", ["/PID", `${process.pid}`, "/T", "/F"], {
        stdio: "ignore",
      });
      killer.once("close", () => resolve());
      return;
    }

    const closeListener = () => resolve();

    process.once("close", closeListener);
    process.kill("SIGINT");

    setTimeout(() => {
      if (process.exitCode) return;

      Logger.warn(`\x1b[31m[Manager]\x1b[0m Force killing ${name}...`);
      process.kill("SIGKILL");
    }, 5000);
  });
};

const startElectron = async (): Promise<ChildProcess> => {
  runBuildCommand(`yarn run build-resources-electron ${args.getArgs()}`);

  await killElectron();

  Logger.log("\x1b[32m[Electron]\x1b[0m Starting...");

  const electronEnv = {
    ...env,
    ...process.env,
  };

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
      Logger.log(`\x1b[31m[Electron]\x1b[0m Exited with code ${code}`);
    }
    child.removeAllListeners();
  });

  return child;
};

const startExpo = (): ChildProcess => {
  Logger.log("\x1b[32m[Expo]\x1b[0m Starting...");

  const expoEnv = {
    ...env,
    ...process.env,
  };

  return spawnCommand("yarn", ["expo", "start", "-c"], {
    env: expoEnv,
    cwd: APP_PATH,
  });
};

const performRestart = async () => {
  if (state.isRestarting) return;
  state.isRestarting = true;

  try {
    Logger.log("\x1b[33m[Manager]\x1b[0m Restarting Electron...");
    state.electron = await startElectron();
  } catch (error) {
    Logger.error("Error during restart:", (error as Error).message);
  } finally {
    state.isRestarting = false;
  }
};

const performExit = async () => {
  Logger.log("\n\x1b[33m[Manager]\x1b[0m Shutting down all processes...");

  await killElectron();

  try {
    process.stdin.setRawMode(false);
    process.stdin.removeAllListeners();
  } catch {
    // Ignore errors here
  }

  await Promise.allSettled([
    killProcess(state.expo, "Expo"),
    killProcess(state.electron, "Electron"),
  ]);
  if (state.expo && !state.expo.killed) state.expo?.kill("SIGKILL");

  Logger.log("\x1b[32m[Manager]\x1b[0m Goodbye.");
  process.exit(0);
};

const run = async () => {
  state.expo = startExpo();

  state.electron = await startElectron();

  readline.emitKeypressEvents(process.stdin);
  if (process.stdin.isTTY) process.stdin.setRawMode(true);

  Logger.log("\n---------------------------------------------------------");
  Logger.log(" \x1b[1mCONTROLS:\x1b[0m");
  Logger.log(" \x1b[36m[r]\x1b[0m Restart Electron (rebuilds resources)");
  Logger.log(" \x1b[31m[q]\x1b[0m Quit all processes");
  Logger.log("---------------------------------------------------------\n");

  process.stdin.on("keypress", async (_, key) => {
    if (key.name === "q" || (key.ctrl && key.name === "c")) await performExit();
    else if (key.name === "r") await performRestart();
  });
};

// handleExitFromScript(performExit);

run();
