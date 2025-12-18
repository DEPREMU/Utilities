import {
  env,
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
import { execSync } from "child_process";

const run = () => {
  const androidPath = path.join(APP_PATH, "android");
  if (fs.existsSync(androidPath)) {
    console.log("Removing android directory...");
    fs.rmSync(androidPath, { recursive: true, force: true });
  }

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

  console.log("Running prebuild...");
  execSync("yarn run app-prebuild-android", {
    cwd: UTILITIES_PATH,
    stdio: "inherit",
    env: localEnv,
  });

  console.log("Running android build...");
  execSync("npx expo run:android --no-build-cache", {
    cwd: APP_PATH,
    stdio: "inherit",
    env: localEnv,
  });
};

handleExitFromScript(() => {
  console.log("Finished app-build-dev-android script.");
  fs.writeFileSync(pathAppConfig, contentAppConfig);
  process.exit(0);
});
run();
