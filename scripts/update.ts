import type {
  PlatformsOS,
  RequestUploadUpdate,
  RequestIsUpdateAvailable,
  ResponseIsUpdateAvailable,
} from "@types";
import {
  env,
  args,
  APP_PATH,
  versionExpo,
  UTILITIES_PATH,
  UTILITIES_FOR_PC_PATH,
} from "./config.ts";
import fs from "fs";
import path from "path";
import axios from "axios";
import FormData from "form-data";
import { execSync } from "child_process";
import { ZipArchive } from "archiver";
import { Logger } from "@commonSrc/serverOrElectron/logger.ts";
import { Validations } from "@commonSrc/both/validations.ts";

const isNewVersionWeb = {
  linux: false,
  windows: false,
};

const checkIsNewVersion = async (
  buildType: "web" | "android" = "android",
): Promise<boolean> => {
  if (!versionExpo) {
    Logger.error("Version not found");
    process.exit(1);
  }

  try {
    const url = `${process.env.API_URL?.replace(
      "api",
      "updates",
    )}/is-update-available`;
    Logger.log("Checking for new version at URL:", url);
    if (buildType === "android") {
      const body: RequestIsUpdateAvailable<typeof buildType> = {
        buildType,
        platformOS: undefined,
        currentVersion: versionExpo,
      };
      const res = await axios.post<ResponseIsUpdateAvailable>(url, body, {
        timeout: 10000,
      });
      return Validations.isNewVersion(versionExpo, res.data?.latestVersion);
    } else {
      const body: RequestIsUpdateAvailable<typeof buildType> = {
        buildType,
        platformOS: "windows",
        currentVersion: versionExpo,
      };
      const [res1, res2] = await Promise.all([
        axios.post<ResponseIsUpdateAvailable>(url, body, {
          timeout: 10000,
        }),
        axios.post<ResponseIsUpdateAvailable>(
          url,
          { ...body, platformOS: "linux" },
          {
            timeout: 10000,
          },
        ),
      ]);
      const isNewForWindows = Validations.isNewVersion(
        versionExpo,
        res1.data?.latestVersion,
      );
      const isNewForLinux = Validations.isNewVersion(
        versionExpo,
        res2.data?.latestVersion,
      );

      isNewVersionWeb.windows = isNewForWindows;
      isNewVersionWeb.linux = isNewForLinux;

      return isNewForWindows || isNewForLinux;
    }
  } catch (error) {
    Logger.error(
      "Error checking for new version:",
      error instanceof Error ? error.message : String(error),
    );
    return false;
  }
};

const uploadWeb = async (): Promise<boolean> => {
  try {
    Logger.log("Building web version:", versionExpo);

    const buildPath = path.join(UTILITIES_FOR_PC_PATH, "dist");

    if (!args.ARGS["testing"] || !fs.existsSync(buildPath))
      execSync("yarn run build-web-app-electron", {
        stdio: "inherit",
        cwd: UTILITIES_PATH,
      });
    if (!fs.existsSync(buildPath))
      throw new Error(`Build path not found at ${buildPath}`);

    const dirFiles = fs.readdirSync(buildPath, {
      recursive: true,
      withFileTypes: true,
    });

    const platformsOS: PlatformsOS[] = [];
    if (isNewVersionWeb.windows) platformsOS.push("windows");
    if (isNewVersionWeb.linux) platformsOS.push("linux");

    const zipPath = path.join(
      UTILITIES_FOR_PC_PATH,
      "dist",
      "temp_web_build.zip",
    );
    const output = fs.createWriteStream(zipPath);

    const zip = new ZipArchive({
      zlib: { level: 9 },
    });
    zip.pipe(output);

    dirFiles.forEach((file) => {
      if (file.isFile()) {
        const filePath = path.join(buildPath, file.name);
        zip.file(filePath, { name: file.name });
      } else if (file.isDirectory()) {
        const dirPath = path.join(buildPath, file.name);
        zip.directory(dirPath, file.name);
      }
    });

    await zip.finalize();

    if (!fs.existsSync(zipPath))
      throw new Error(`Zip file not found at ${zipPath}`);

    const url = `${process.env.API_URL?.replace(
      "api",
      "updates",
    )}/upload-update`;
    Logger.log("Uploading updates to URL:", url);

    if (args.ARGS["testing"]) {
      Logger.log(
        "Testing mode enabled - skipping actual upload. Zip file created at:",
        zipPath,
      );
      return true;
    }

    const uploadPromises = platformsOS.map(async (platformOS) => {
      try {
        const data: RequestUploadUpdate = {
          buildType: "web",
          platformOS,
          version: versionExpo,
        };

        Logger.log(`Uploading web build for ${platformOS}...`, data);

        const formData = new FormData();
        formData.append("data", JSON.stringify(data));
        formData.append("file", fs.createReadStream(zipPath));

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
          timeout: 60000,
        });

        Logger.log(`Upload successful for ${platformOS}:`, response.data);
        return {
          platformOS,
          success: !response.data.error,
          data: response.data,
        };
      } catch (error) {
        Logger.error(`Failed to upload for ${platformOS}:`);
        Logger.error(error instanceof Error ? error.message : String(error));
        return {
          platformOS,
          success: false,
          error: error instanceof Error ? error.message : String(error),
        };
      }
    });

    const results = await Promise.all(uploadPromises);

    Logger.log("\n=== Upload Summary ===");
    const successCount = results.filter((r) => r.success).length;
    results.forEach((result) => {
      const status = result.success ? "Success" : "Failed";
      Logger.log(`${result.platformOS}: ${status}`);
      if (!result.success) {
        Logger.log(
          `  Error: ${result.data?.error || result?.error || "Unknown error"}`,
        );
      }
    });

    Logger.log(`\nTotal: ${successCount}/${results.length} successful uploads`);

    if (successCount === 0) {
      throw new Error("All uploads failed");
    }
    return true;
  } catch (error) {
    Logger.error(
      "Fatal error:",
      error instanceof Error ? error.message : String(error),
    );
    return false;
  }
};

const uploadAndroidAssets = async () => {
  const BUILD_PROFILE = args.ARGS["BUILD_PROFILE"] || "production";

  if (!args.ARGS.testing) {
    execSync(
      ` eas update --channel ${BUILD_PROFILE} --platform android --clear-cache`,
      {
        stdio: "inherit",
        cwd: APP_PATH,
        env: {
          ...env,
          PLATFORM: "android",
          EAS_BUILD: "true",
          BUILD_PROFILE,
        },
      },
    );
  } else {
    Logger.log("Testing mode: Skipping eas update for Android assets");
  }
};

export const run = async () => {
  const platformUpdateAssets = args.ARGS["platform-update-assets"] ?? "both";

  const isBoth = platformUpdateAssets === "both";
  const isWeb = isBoth || platformUpdateAssets === "web";
  const isAndroid = isBoth || platformUpdateAssets === "android";

  const isNewVersionWeb =
    args.ARGS["testing"] || (isWeb && (await checkIsNewVersion("web")));

  if (isNewVersionWeb) await uploadWeb();

  if (isAndroid) await uploadAndroidAssets();
};

if (process.env.NODE_ENV !== "test") {
  run();
}
