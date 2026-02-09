import {
  env,
  ARGS,
  APP_PATH,
  UTILITIES_PATH,
  handleExitFromScript,
  PLATFORM,
} from "../config.ts";
import {
  pathAppConfig,
  replaceAppConfig,
  contentAppConfig,
} from "./editAppConfig.ts";
import fs from "fs";
import path from "path";
import { execSync, spawn } from "child_process";

const localEnv = {
  ...env,
  PLATFORM: "android",
  BUILD_PROFILE: "development",
};

replaceAppConfig(
  (prev) => (prev.endsWith("-dev") ? prev : `${prev}-dev`),
  (prev) => (prev.includes("Dev") ? prev : `${prev} Dev`),
  (prev) => (prev.includes(".dev") ? prev : `${prev}.dev`),
);

let expo: ReturnType<typeof spawn>;

const spawnCommand = (
  command: string,
  argsList: string[],
  options: Parameters<typeof spawn>[2] = {},
): ReturnType<typeof spawn> => {
  return spawn(command, argsList, {
    ...options,
    shell: PLATFORM.isWindows,
    stdio: "inherit",
  });
};

const killProcessTree = (child?: ReturnType<typeof spawn> | null): void => {
  if (!child || child.killed || child.exitCode !== null) return;

  if (PLATFORM.isWindows && child.pid) {
    spawn("taskkill", ["/PID", `${child.pid}`, "/T", "/F"], {
      stdio: "ignore",
    });
    return;
  }

  child.kill("SIGINT");
};

handleExitFromScript(() => {
  console.log("Finished app-build-dev-android script.");
  fs.writeFileSync(pathAppConfig, contentAppConfig);
  killProcessTree(expo);

  if (PLATFORM.isWindows) return;
  console.log("Cleaning up java processes...");
  spawn("pkill", ["-f", "java"]);
});

const run = () => {
  const androidPath = path.join(APP_PATH, "android");
  if (fs.existsSync(androidPath)) {
    console.log("Removing android directory...");
    fs.rmSync(androidPath, { recursive: true, force: true });
  }

  console.log("Running prebuild...");
  execSync("yarn run app-prebuild-android", {
    cwd: UTILITIES_PATH,
    stdio: "inherit",
    env: localEnv,
  });

  console.log("Running android build...");
  expo = spawnCommand(
    PLATFORM.isWindows ? "yarn" : "taskset",
    PLATFORM.isWindows
      ? ["expo", "run:android", "--no-build-cache"]
      : ["-c", "0-5", "yarn", "expo", "run:android", "--no-build-cache"],
    {
      cwd: APP_PATH,
      env: localEnv,
    },
  );
};

const runExpo = () => {
  console.log("Running expo...");

  expo = spawnCommand("expo", ["start", "--clear", "--dev-client"], {
    cwd: APP_PATH,
    env: localEnv,
  });
};

if (!ARGS["skip-build-android"]) run();
else runExpo();
