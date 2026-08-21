import fs from "fs";
import path from "path";
import axios from "axios";
import FormData from "form-data";
import { Logger } from "@commonSrc/serverOrElectron";
import type * as Types from "@types";
import { APP_PATH, versionExpo } from "../config.ts";
import { Validations, ServerFetch } from "@commonSrc/both";

/**
 * Uploads Android APK build to the update server.
 * Builds the APK using EAS and uploads it to the server.
 * Usage: node build-android-upload.ts [profile]
 * Profiles: development, preview, production (default: production)
 */

const checkIsNewVersion = async () => {
  try {
    const res = await ServerFetch.get(
      "/updates/is-update-available/:version/:buildType",
      {
        params: {
          version: versionExpo,
          buildType: "android",
        },
      },
    );

    const result = res.data;

    if (!Validations.isNewVersion(versionExpo, result.latestVersion)) {
      Logger.log("Version already exists on the server.");
      process.exit(0);
    } else
      Logger.log("New version detected. Proceeding with build and upload.");
  } catch (error) {
    Logger.error("Error checking for new version:", error);
    process.exit(1);
  }
};

const uploadAndroidBuild = async () => {
  try {
    Logger.log(`Uploading Android build, version: ${versionExpo}`);

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
    Logger.log(`Found APK: ${apkFile}`);

    const data: Types.RequestUploadUpdate = {
      version: versionExpo,
      buildType: "android",
    };

    Logger.log(`Uploading Android build...`, data);

    const formData = new FormData();
    formData.append("data", JSON.stringify(data));
    formData.append("file", fs.createReadStream(apkPath));

    const contentLength = await new Promise<number>((resolve, reject) => {
      formData.getLength((err, length) => {
        if (err) reject(err);
        else resolve(length);
      });
    });

    const url = ServerFetch.getRoute("GET", "/updates/upload");
    const response = await axios.post(url, formData, {
      headers: {
        ...formData.getHeaders(),
        "Content-Length": contentLength,
      },
      maxContentLength: Infinity,
      maxBodyLength: Infinity,
      timeout: 10 * 60 * 1000,
    });

    Logger.log("Upload successful:", response.data);

    if (response.data.error) {
      throw new Error(`Upload failed: ${response.data.error}`);
    }

    Logger.log("\nAndroid build uploaded successfully!");
  } catch (error) {
    Logger.error(
      "Fatal error during Android upload:",
      error instanceof Error ? error.message : String(error),
    );
    process.exit(1);
  }
};

Logger.log("=== Android Build and Upload Process ===\n");

const run = async () => {
  await checkIsNewVersion();
  await uploadAndroidBuild();
};

run();
