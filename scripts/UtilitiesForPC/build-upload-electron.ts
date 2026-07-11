import {
  args,
  PLATFORM,
  UTILITIES_PATH,
  versionElectron,
  UTILITIES_FOR_PC_PATH,
} from "../config.ts";
import fs from "fs";
import path from "path";
import axios from "axios";
import FormData from "form-data";
import { Logger } from "@commonSrc/serverOrElectron/logger.ts";
import { execSync } from "child_process";
import { ServerFetch } from "@commonSrc/both/index.ts";
import type { PlatformsOS, RequestUploadUpdate } from "@types";

let isNewVersionLinux: boolean;
let isNewVersionWindows: boolean;

const isNewVersionPlatform = async (platform: PlatformsOS) => {
  try {
    const res = await ServerFetch.get(
      "/updates/is-update-available/:version/:buildType/:platform-optional",
      {
        platform,
        version: versionElectron,
        buildType: "electron",
      },
    );

    return res.data.isUpdateAvailable;
  } catch (error) {
    Logger.error(
      "Error checking for new version:",
      error instanceof Error ? error.message : String(error),
    );
  }
  return true;
};

const uploadElectronBuilds = async () => {
  try {
    Logger.log("Uploading Electron builds, version:", versionElectron);

    const distElectronPath = path.join(UTILITIES_FOR_PC_PATH, "dist-electron");

    if (!fs.existsSync(distElectronPath)) {
      throw new Error(
        `Electron dist directory not found at ${distElectronPath}`,
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
        "No Electron build files found (.deb or .exe) in dist-electron/",
      );
    }

    Logger.log(
      `Found ${availablePlatforms.length} build(s):`,
      availablePlatforms
        .map((p) => `${p.platformOS} (${path.basename(p.file)})`)
        .join(", "),
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
            version: versionElectron,
          };

          Logger.log(
            `Uploading ${platformOS} build: ${path.basename(file)}...`,
            data,
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
            ServerFetch.getRoute("/updates/upload"),
            formData,
            {
              headers: {
                ...formData.getHeaders(),
                "Content-Length": contentLength,
              },
              maxContentLength: Infinity,
              maxBodyLength: Infinity,
              timeout: 10 * 60 * 1000,
            },
          );

          Logger.log(`Upload successful for ${platformOS}:`, response.data);
          return {
            platformOS,
            success: !response.data?.error,
            data: response.data,
          };
        } catch (error) {
          Logger.error(`Failed to upload ${platformOS} build:`);
          Logger.error(error instanceof Error ? error.message : String(error));
          return {
            platformOS,
            success: false,
            error: error instanceof Error ? error.message : String(error),
          };
        }
      },
    );

    const results = await Promise.all(uploadPromises);

    Logger.log("\n=== Electron Upload Summary ===");
    const successCount = results.filter((r) => r.success).length;
    results.forEach((result) => {
      const status = result.success ? "Success" : "Failed";
      Logger.log(`${result.platformOS}: ${status}`);
      if (!result.success && "error" in result) {
        Logger.log(`  Error: ${result.error}`);
      }
    });

    Logger.log(`\nTotal: ${successCount}/${results.length} successful uploads`);

    if (successCount === 0) {
      throw new Error("All Electron uploads failed");
    }

    Logger.log("\nElectron builds uploaded successfully!");
  } catch (error) {
    Logger.error(
      "Fatal error during Electron upload:",
      error instanceof Error ? error.message : String(error),
    );
    process.exit(1);
  }
};

const buildElectronApp = () => {
  Logger.log("Starting Electron app build process...");

  if (!fs.existsSync(UTILITIES_FOR_PC_PATH)) {
    throw new Error(
      `UtilitiesForPC directory not found at ${UTILITIES_FOR_PC_PATH}`,
    );
  }

  const platform = PLATFORM.isWindows ? "windows" : "linux";

  Logger.log(`Building Electron app for platform: ${platform}`);

  const ARGS = args.getArgs();

  execSync(
    `yarn run build-app-electron ${
      ARGS.includes("platform") ? ARGS : `${ARGS} --platform=${platform}`
    }`,
    {
      cwd: UTILITIES_PATH,
      stdio: "inherit",
      killSignal: "SIGINT",
    },
  );

  Logger.log("Electron app build completed!");
};

Logger.log("=== Electron Build and Upload Process ===\n");

if (PLATFORM.isWindows) {
  const isElevated = () => {
    try {
      execSync("net session", { stdio: "ignore" });
      return true;
    } catch {
      return false;
    }
  };

  if (!isElevated()) {
    const command = `cd ${UTILITIES_PATH}; yarn run build-upload-electron ${args.getArgs()}; pause`;

    execSync(
      `powershell -NoProfile -ExecutionPolicy Bypass -Command "Start-Process PowerShell -Verb RunAs -ArgumentList '-NoProfile -ExecutionPolicy Bypass -Command ${command}'"`,
      { stdio: "inherit" },
    );
    process.exit(0);
  }
}

const run = async () => {
  if (PLATFORM.isWindows) {
    isNewVersionWindows = await isNewVersionPlatform("windows");
  } else {
    isNewVersionLinux = await isNewVersionPlatform("linux");
  }

  if (!isNewVersionLinux && !isNewVersionWindows) {
    Logger.log(
      "No new version available for either platform. Exiting without uploading.",
    );
    return;
  }

  if (!args.ARGS["skip-build-electron"]) buildElectronApp();
  uploadElectronBuilds().catch((error) => {
    Logger.error(
      "Process failed:",
      error instanceof Error ? error.message : String(error),
    );
    process.exit(1);
  });
};
run();
