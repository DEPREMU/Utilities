import fs from "fs";
import path from "path";
import { execSync } from "child_process";
import { APP_PATH, env, UTILITIES_PATH } from "../config.ts";

const run = () => {
  const androidPath = path.join(APP_PATH, "android");
  if (fs.existsSync(androidPath)) {
    console.log("Removing android directory...");
    fs.rmSync(androidPath, { recursive: true, force: true });
  }

  console.log("Running prebuild...");
  execSync("npm run app-prebuild-android", {
    cwd: UTILITIES_PATH,
    stdio: "inherit",
    env,
  });

  console.log("Running android build...");
  execSync("npx expo run:android", {
    cwd: APP_PATH,
    stdio: "inherit",
    env: {
      ...env,
      PLATFORM: "android",
    },
  });
};

run();
