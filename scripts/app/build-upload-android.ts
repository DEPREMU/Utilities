import {
  env,
  ARGS,
  getArgs,
  APP_PATH,
  versionExpo,
  isNewVersion,
  UTILITIES_PATH,
  getRouteUpdates,
  handleExitFromScript,
  deleteAndroidFromGitIgnore,
} from "../config.ts";
import fs from "fs";
import path from "path";
import axios from "axios";
import FormData from "form-data";
import { execSync } from "child_process";
import type * as Types from "@types";

/**
 * Uploads Android APK build to the update server.
 * Builds the APK using EAS and uploads it to the server.
 * Usage: node build-android-upload.ts [profile]
 * Profiles: development, preview, production (default: production)
 */

deleteAndroidFromGitIgnore();

const checkIsNewVersion = async () => {
  try {
    const body: Types.RequestIsUpdateAvailable<"android"> = {
      buildType: "android",
      currentVersion: versionExpo,
      platformOS: undefined,
    };

    const res = await fetch(getRouteUpdates("/is-update-available"), {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(body),
    });

    const result = (await res.json()) as Types.ResponseIsUpdateAvailable;

    if (!isNewVersion(versionExpo, result.latestVersion)) {
      console.log("Version already exists on the server.");
      process.exit(0);
    } else
      console.log("New version detected. Proceeding with build and upload.");
  } catch (error) {
    console.error("Error checking for new version:", error);
    process.exit(1);
  }
};

const uploadAndroidBuild = async () => {
  try {
    const url = getRouteUpdates("/upload-update");

    console.log(`Uploading Android build, version: ${versionExpo}`);
    console.log(`Uploading to URL: ${url}`);

    const appBuildsPath = path.join(APP_PATH, "builds");

    if (!fs.existsSync(appBuildsPath)) {
      throw new Error(`Android builds directory not found at ${appBuildsPath}`);
    }

    const files = fs.readdirSync(appBuildsPath);
    const apkFile = files.find((file) => file.endsWith(".apk"));

    if (!apkFile) {
      throw new Error("No APK file found in app/builds/");
    }

    const apkPath = path.join(appBuildsPath, apkFile);
    console.log(`Found APK: ${apkFile}`);

    const data: Types.RequestUploadUpdate = {
      buildType: "android",
      version: versionExpo,
      timestamp: Date.now(),
      platformOS: undefined,
    };

    console.log(`Uploading Android build...`, data);

    const formData = new FormData();
    formData.append("data", JSON.stringify(data));
    formData.append("file", fs.createReadStream(apkPath));

    const contentLength = await new Promise<number>((resolve, reject) => {
      formData.getLength((err, length) => {
        if (err) reject(err);
        else resolve(length);
      });
    });

    const response = await axios.post(url, formData, {
      headers: {
        ...formData.getHeaders(),
        "Content-Length": contentLength,
      },
      maxContentLength: Infinity,
      maxBodyLength: Infinity,
      timeout: 10 * 60 * 1000,
    });

    console.log("Upload successful:", response.data);

    if (response.data.error) {
      throw new Error(`Upload failed: ${response.data.error}`);
    }

    console.log("\nAndroid build uploaded successfully!");
  } catch (error) {
    console.error(
      "Fatal error during Android upload:",
      error instanceof Error ? error.message : String(error)
    );
    process.exit(1);
  }
};

console.log("=== Android Build and Upload Process ===\n");

const handleClose = () => {
  deleteAndroidFromGitIgnore(true);
  process.exit(0);
};

handleExitFromScript(handleClose);

const run = async () => {
  await checkIsNewVersion();
  if (!ARGS["skip-build-android"])
    execSync(`npm run build-android -- ${getArgs()}`, {
      env,
      stdio: "inherit",
      cwd: UTILITIES_PATH,
      killSignal: "SIGINT",
    });
  await uploadAndroidBuild();
  handleClose();
};

run();
