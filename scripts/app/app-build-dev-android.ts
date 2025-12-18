import {
  env,
  APP_PATH,
  UTILITIES_PATH,
  handleExitFromScript,
} from "../config.ts";
import fs from "fs";
import path from "path";
import { execSync } from "child_process";

const pathAppConfig = path.join(APP_PATH, "app.config.ts");

const contentAppConfig = fs.readFileSync(pathAppConfig, "utf8") as string;

let editedContentAppConfig = contentAppConfig;

const replaceVersion = () => {
  const versionMatch = contentAppConfig.match(/const version[^;]+/g);
  if (!versionMatch) throw new Error("Version not found in app config");

  const version = versionMatch[0].split('"')[1];
  if (!version) throw new Error("Version is empty in app config");

  editedContentAppConfig = contentAppConfig.replace(version, "0.0.0-dev");

  fs.writeFileSync(pathAppConfig, editedContentAppConfig);
};

const replacePackageName = () => {
  const packageMatch = contentAppConfig.match(/package:[^,]+/g);
  if (!packageMatch) throw new Error("Package name not found in app config");

  const packageName = packageMatch[0].split(":")[1].trim().replace(/['"]/g, "");
  if (!packageName) throw new Error("Package name is empty in app config");

  editedContentAppConfig = editedContentAppConfig.replace(
    packageName,
    packageName + ".dev"
  );

  fs.writeFileSync(pathAppConfig, editedContentAppConfig);
};

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

  replaceVersion();
  replacePackageName();

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
