import {
  env,
  ARGS,
  getArgs,
  APP_PATH,
  handleExitFromScript,
  UTILITIES_FOR_PC_PATH,
} from "../config.ts";
import axios from "axios";
import * as readline from "readline";
import { spawn, execSync, type ChildProcess } from "child_process";

ARGS.profile = "development";
const args = getArgs();

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

const runBuildCommand = (command: string): void => {
  try {
    console.log(`\x1b[36m[Build]\x1b[0m Executing: ${command}`);
    execSync(command, {
      env,
      stdio: "inherit",
    });
  } catch (error) {
    console.error("\x1b[31m[Build Error]\x1b[0m Command failed:", error);
  }
};

const killElectron = async (): Promise<void> => {
  try {
    if (!state.electron) return;

    const res = await axios.get("http://localhost:9090/close-app", {
      timeout: 5000,
    });
    if (!res.data?.success) console.error("Failed to close Electron app");

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

    console.log(`\x1b[33m[Manager]\x1b[0m Stopping ${name}...`);

    const closeListener = () => resolve();

    process.once("close", closeListener);
    process.kill("SIGINT");

    setTimeout(() => {
      if (process.exitCode) return;

      console.warn(`\x1b[31m[Manager]\x1b[0m Force killing ${name}...`);
      process.kill("SIGKILL");
    }, 5000);
  });
};

const startElectron = async (): Promise<ChildProcess> => {
  runBuildCommand(`yarn run build-resources-electron ${args}`);

  await killElectron();

  console.log("\x1b[32m[Electron]\x1b[0m Starting...");

  const electronEnv = {
    ...env,
    ...process.env,
  };

  const child = spawn(
    "npx",
    ["electron", ".", "--expose-gc", "--no-sandbox", "--ozone-platform=x11"],
    {
      cwd: UTILITIES_FOR_PC_PATH,
      env: electronEnv,
      stdio: "inherit",
      killSignal: "SIGKILL",
    },
  );

  child.on("close", (code) => {
    if (!state.isRestarting && !!code) {
      console.log(`\x1b[31m[Electron]\x1b[0m Exited with code ${code}`);
    }
    child.removeAllListeners();
  });

  return child;
};

const startExpo = (): ChildProcess => {
  console.log("\x1b[32m[Expo]\x1b[0m Starting...");

  const expoEnv = {
    ...process.env,
    PLATFORM: "web",
    BUILD_PROFILE: "development",
  };

  return spawn("npx", ["expo", "start", "-c"], {
    env: expoEnv,
    cwd: APP_PATH,
    stdio: "inherit",
    killSignal: "SIGINT",
  });
};

const performRestart = async () => {
  if (state.isRestarting) return;
  state.isRestarting = true;

  try {
    console.log("\x1b[33m[Manager]\x1b[0m Restarting Electron...");
    state.electron = await startElectron();
  } catch (error) {
    console.error("Error during restart:", (error as Error).message);
  } finally {
    state.isRestarting = false;
  }
};

const performExit = async () => {
  console.log("\n\x1b[33m[Manager]\x1b[0m Shutting down all processes...");

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

  console.log("\x1b[32m[Manager]\x1b[0m Goodbye.");
  process.exit(0);
};

const run = async () => {
  state.expo = startExpo();

  state.electron = await startElectron();

  readline.emitKeypressEvents(process.stdin);
  if (process.stdin.isTTY) process.stdin.setRawMode(true);

  console.log("\n---------------------------------------------------------");
  console.log(" \x1b[1mCONTROLS:\x1b[0m");
  console.log(" \x1b[36m[r]\x1b[0m Restart Electron (rebuilds resources)");
  console.log(" \x1b[31m[q]\x1b[0m Quit all processes");
  console.log("---------------------------------------------------------\n");

  process.stdin.on("keypress", async (_, key) => {
    if (key.name === "q" || (key.ctrl && key.name === "c")) await performExit();
    else if (key.name === "r") await performRestart();
  });
};

handleExitFromScript(performExit);

run();
