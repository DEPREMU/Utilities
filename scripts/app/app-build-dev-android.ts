import {
  env,
  ARGS,
  APP_PATH,
  UTILITIES_PATH,
  handleExitFromScript,
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
  NODE_ENV: "development",
  BUILD_PROFILE: "development",
};

replaceAppConfig(
  (prev) => (prev.endsWith("-dev") ? prev : `${prev}-dev`),
  (prev) => (prev.includes("Dev") ? prev : `${prev} Dev`),
  (prev) => (prev.includes(".dev") ? prev : `${prev}.dev`)
);

let expo: ReturnType<typeof spawn>;

handleExitFromScript(() => {
  console.log("Finished app-build-dev-android script.");
  fs.writeFileSync(pathAppConfig, contentAppConfig);
  expo?.kill();
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
  expo = spawn(
    "taskset",
    ["-c", "0-5", "npx", "expo", "run:android", "--no-build-cache"],
    {
      cwd: APP_PATH,
      env: localEnv,
      stdio: "inherit",
    }
  );
};

const runExpo = () => {
  console.log("Running expo...");
  expo = spawn("npx", ["expo", "start", "--dev-client"], {
    cwd: APP_PATH,
    env: localEnv,
    stdio: "inherit",
  });
};

if (!ARGS["skip-build-android"]) run();
else runExpo();
