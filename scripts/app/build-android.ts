import {
  env,
  ask,
  ARGS,
  APP_PATH,
  ANDROID_PATH,
  handleExitFromScript,
  deleteAndroidFromGitIgnore,
} from "../config.ts";
import fs from "fs";
import { execSync } from "child_process";

const updateEasCLI = () => {
  try {
    execSync("npm install -g eas-cli@latest", {
      stdio: "inherit",
    });
  } catch (error) {
    console.error("Failed to update eas-cli:", error);
  }
};

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
  env.BUILD_PROFILE = profile;

  if (!ARGS["skip-prebuild-android"]) {
    fs.rmSync(ANDROID_PATH, { recursive: true, force: true });

    execSync("npm run prebuild", {
      env,
      stdio: "inherit",
      cwd: APP_PATH,
      killSignal: "SIGINT",
    });
  }
  if (!fs.existsSync(ANDROID_PATH))
    throw new Error("Android directory does not exist.");

  env.EAS_BUILD = "true";

  execSync(
    `taskset -c 0-5 eas build --platform android --profile ${profile} --local --output=./builds/android.apk`,
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

  execSync(`adb install -r ./builds/android.apk`, {
    env,
    stdio: "inherit",
    cwd: APP_PATH,
  });
};

const handleExit = () => {
  deleteAndroidFromGitIgnore(true);
  process.exit();
};

handleExitFromScript(handleExit);

const run = async () => {
  deleteAndroidFromGitIgnore();
  updateEasCLI();
  await build();
  handleExit();
};

run();
