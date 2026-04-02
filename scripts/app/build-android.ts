import {
  env,
  ask,
  ARGS,
  getArgs,
  APP_PATH,
  GRADLE_OPTS,
  ANDROID_PATH,
  UTILITIES_PATH,
  handleExitFromScript,
  deleteAndroidFromGitIgnore,
} from "../config.ts";
import fs from "fs";
import path from "path";
import { execSync, spawn } from "child_process";

let expo: ReturnType<typeof spawn> | null = null;

const build = async () => {
  let profile = ARGS.BUILD_PROFILE ?? (ARGS.yes ? "production" : undefined);

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
  env.BUILD_PROFILE = profile;
  env.GRADLE_OPTS = GRADLE_OPTS;

  if (!ARGS["skip-prebuild-android"]) {
    fs.rmSync(ANDROID_PATH, { recursive: true, force: true });

    execSync(`yarn run app-prebuild-android ${getArgs()}`, {
      env,
      stdio: "inherit",
      cwd: UTILITIES_PATH,
      killSignal: "SIGINT",
    });
  }
  if (!fs.existsSync(ANDROID_PATH))
    throw new Error("Android directory does not exist.");

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
    },
  );

  let timePassed = 0;
  let notWritten = true;

  while (expo.exitCode === null) {
    await new Promise((resolve) => setTimeout(resolve, 1000));
    timePassed += 1;

    if (timePassed % 60 === 0)
      console.log(
        `EAS Build is still running... ${timePassed} seconds passed.`,
      );
    if (notWritten && timePassed >= 60 * 2) {
      notWritten = false;
      deleteAndroidFromGitIgnore(true);
    }
  }

  expo.once("message", (msg) => {
    console.log("EAS Build message:", msg);
  });

  if (!ARGS.yes) {
    const answerInstall = (
      await ask(
        "Do you want to install the APK on a connected device? (y/n):\n",
      )
    )
      .toLowerCase()
      .trim();

    if (!answerInstall.includes("y"))
      return console.log("Build process completed without installation.");
  }
  if (!fs.existsSync(buildPath))
    throw new Error(`APK not found at path: ${buildPath}`);

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
