import type {
  PlatformsOS,
  RequestUploadUpdate,
  RequestIsUpdateAvailable,
} from "../types/index";
import {
  ARGS,
  isNewVersion,
  versionElectron,
  getRouteUpdates,
  UTILITIES_FOR_PC_PATH,
  getArgs,
} from "./config.ts";
import fs from "fs";
import path from "path";
import axios from "axios";
import FormData from "form-data";
import { execSync } from "child_process";
import type * as Types from "@types";

let isNewVersionLinux: boolean;
let isNewVersionWindows: boolean;

const isNewVersionPlatform = async (platformOS: PlatformsOS) => {
  try {
    const body: RequestIsUpdateAvailable = {
      buildType: "electron",
      currentVersion: versionElectron,
      platformOS,
    };

    const res = await fetch(getRouteUpdates("/is-update-available"), {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(body),
    });

    const result = (await res.json()) as Types.ResponseIsUpdateAvailable;

    return isNewVersion(versionElectron, result.latestVersion);
  } catch (error) {
    console.error(
      "Error checking for new version:",
      error instanceof Error ? error.message : String(error)
    );
  }
  return true;
};

const uploadElectronBuilds = async () => {
  try {
    console.log("Uploading Electron builds, version:", versionElectron);

    const distElectronPath = path.join(UTILITIES_FOR_PC_PATH, "dist-electron");

    if (!fs.existsSync(distElectronPath)) {
      throw new Error(
        `Electron dist directory not found at ${distElectronPath}`
      );
    }

    const files = fs.readdirSync(distElectronPath);

    const linuxDebFile = files.find((file) => file.endsWith(".deb"));
    const windowsExeFile = files.find((file) => file.endsWith(".exe"));

    const availablePlatforms: Array<{
      platformOS: PlatformsOS;
      file: string;
    }> = [];

    if (linuxDebFile && isNewVersionLinux) {
      availablePlatforms.push({
        platformOS: "linux",
        file: path.join(distElectronPath, linuxDebFile),
      });
    }

    if (windowsExeFile && isNewVersionWindows) {
      availablePlatforms.push({
        platformOS: "windows",
        file: path.join(distElectronPath, windowsExeFile),
      });
    }

    if (availablePlatforms.length === 0) {
      throw new Error(
        "No Electron build files found (.deb or .exe) in dist-electron/"
      );
    }

    console.log(
      `Found ${availablePlatforms.length} build(s):`,
      availablePlatforms
        .map((p) => `${p.platformOS} (${path.basename(p.file)})`)
        .join(", ")
    );

    const uploadPromises = availablePlatforms.map(
      async ({ platformOS, file }) => {
        try {
          if (
            !(platformOS === "linux" ? isNewVersionLinux : isNewVersionWindows)
          ) {
            return {
              platformOS,
              success: false,
              error: `Version ${versionElectron} already exists on the server for ${platformOS}`,
            };
          }
          const data: RequestUploadUpdate = {
            buildType: "electron",
            platformOS,
            timestamp: Date.now(),
            version: versionElectron,
          };

          console.log(
            `Uploading ${platformOS} build: ${path.basename(file)}...`,
            data
          );

          const formData = new FormData();
          formData.append("data", JSON.stringify(data));
          formData.append("file", fs.createReadStream(file));

          const contentLength = await new Promise<number>((resolve, reject) => {
            formData.getLength((err, length) => {
              if (err) reject(err);
              else resolve(length);
            });
          });

          const response = await axios.post(
            getRouteUpdates("/upload-update"),
            formData,
            {
              headers: {
                ...formData.getHeaders(),
                "Content-Length": contentLength,
              },
              maxContentLength: Infinity,
              maxBodyLength: Infinity,
              timeout: 10 * 60 * 1000,
            }
          );

          console.log(`Upload successful for ${platformOS}:`, response.data);
          return {
            platformOS,
            success: !response.data?.error,
            data: response.data,
          };
        } catch (error) {
          console.error(`Failed to upload ${platformOS} build:`);
          console.error(error instanceof Error ? error.message : String(error));
          return {
            platformOS,
            success: false,
            error: error instanceof Error ? error.message : String(error),
          };
        }
      }
    );

    const results = await Promise.all(uploadPromises);

    console.log("\n=== Electron Upload Summary ===");
    const successCount = results.filter((r) => r.success).length;
    results.forEach((result) => {
      const status = result.success ? "Success" : "Failed";
      console.log(`${result.platformOS}: ${status}`);
      if (!result.success && "error" in result) {
        console.log(`  Error: ${result.error}`);
      }
    });

    console.log(
      `\nTotal: ${successCount}/${results.length} successful uploads`
    );

    if (successCount === 0) {
      throw new Error("All Electron uploads failed");
    }

    console.log("\nElectron builds uploaded successfully!");
  } catch (error) {
    console.error(
      "Fatal error during Electron upload:",
      error instanceof Error ? error.message : String(error)
    );
    process.exit(1);
  }
};

const buildElectronApp = () => {
  console.log("Starting Electron app build process...");

  if (!fs.existsSync(UTILITIES_FOR_PC_PATH)) {
    throw new Error(
      `UtilitiesForPC directory not found at ${UTILITIES_FOR_PC_PATH}`
    );
  }

  let platform = ARGS.platform || "both";

  if (platform === "both") {
    if (isNewVersionLinux) {
      console.log(
        `Building only for Linux as Windows is up to date for version ${versionElectron}.`
      );
      platform = "linux";
    }
    if (isNewVersionWindows) {
      console.log(
        `Building only for Windows as Linux is up to date for version ${versionElectron}.`
      );
      platform = "windows";
    }
    if (!isNewVersionLinux && !isNewVersionWindows) {
      console.log(
        "No new updates available for either platform. Skipping build."
      );
      process.exit(0);
    }
  }

  console.log(`Building Electron app for platform: ${platform}`);

  const args = getArgs();

  execSync(
    `npm run build-app -- ${
      args.includes("platform") ? args : `${args} --platform=${platform}`
    }`,
    {
      cwd: UTILITIES_FOR_PC_PATH,
      stdio: "inherit",
      killSignal: "SIGINT",
    }
  );

  console.log("Electron app build completed!");
};

console.log("=== Electron Build and Upload Process ===\n");

const run = async () => {
  isNewVersionLinux = await isNewVersionPlatform("linux");
  isNewVersionWindows = await isNewVersionPlatform("windows");
  buildElectronApp();
  uploadElectronBuilds().catch((error) => {
    console.error("Process failed:", error);
    process.exit(1);
  });
};
run();
