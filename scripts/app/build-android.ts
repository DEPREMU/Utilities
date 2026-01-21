import {
  env,
  ask,
  ARGS,
  APP_PATH,
  ANDROID_PATH,
  UTILITIES_PATH,
  handleExitFromScript,
  deleteAndroidFromGitIgnore,
} from "../config.ts";
import fs from "fs";
import path from "path";
import { execSync, spawn } from "child_process";
import { replaceAppConfig } from "./editAppConfig.ts";

let expo: ReturnType<typeof spawn> | null = null;

replaceAppConfig(
  (prev) => prev.replace(/-dev/g, ""),
  (prev) => prev.replace(/ Dev/g, ""),
  (prev) => prev.replace(/\.dev/g, "")
);

const build = async () => {
  let profile = ARGS.profile ?? (ARGS.yes ? "production" : undefined);

  if (!profile) {
    const answer = (
      await ask("Enter the build profile (development, preview, production):\n")
    )
      .toLowerCase()
      .trim();

    if (answer.includes("dev") || answer.startsWith("d"))
      profile = "development";
    else if (
      answer.includes("pre") ||
      (answer.startsWith("pr") && !answer.startsWith("pro"))
    )
      profile = "preview";
    else profile = "production";
  }
  env.NODE_ENV = profile;
  env.BUILD_PROFILE = profile;

  if (!ARGS["skip-prebuild-android"]) {
    fs.rmSync(ANDROID_PATH, { recursive: true, force: true });

    execSync("yarn run app-prebuild-android", {
      env,
      stdio: "inherit",
      cwd: UTILITIES_PATH,
      killSignal: "SIGINT",
    });
  }
  if (!fs.existsSync(ANDROID_PATH))
    throw new Error("Android directory does not exist.");

  env.EAS_BUILD = "true";
  const buildPath = path.join(APP_PATH, "builds", `android-${profile}.apk`);

  expo = spawn(
    "taskset",
    [
      "-c",
      "0-5",
      "eas",
      "build",
      "--platform",
      "android",
      "--profile",
      profile,
      "--local",
      `--output=${buildPath}`,
    ],
    {
      env,
      stdio: "inherit",
      cwd: APP_PATH,
      killSignal: "SIGINT",
    }
  );

  if (!ARGS.yes) {
    const answerInstall = (
      await ask(
        "Do you want to install the APK on a connected device? (y/n):\n"
      )
    )
      .toLowerCase()
      .trim();

    if (!answerInstall.includes("y"))
      return console.log("Build process completed without installation.");
  }

  console.log("Installing APK on connected device...");

  execSync(`adb install -r "${buildPath}"`, {
    env,
    stdio: "inherit",
    cwd: APP_PATH,
  });
};

const handleExit = () => {
  deleteAndroidFromGitIgnore(true);
  expo?.kill();
  spawn("pkill", ["-f", "java"]);
  process.exit();
};

handleExitFromScript(handleExit);

const run = async () => {
  deleteAndroidFromGitIgnore();
  await build();
  handleExit();
};

run();
