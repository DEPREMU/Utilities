import type {
  PlatformsOS,
  RequestUploadUpdate,
  RequestIsUpdateAvailable,
  ResponseIsUpdateAvailable,
} from "./../types/";
import {
  env,
  ARGS,
  APP_PATH,
  versionExpo,
  isNewVersion,
  UTILITIES_PATH,
  UTILITIES_FOR_PC_PATH,
} from "./config.ts";
import fs from "fs";
import path from "path";
import axios from "axios";
import FormData from "form-data";
import { execSync } from "child_process";

const isNewVersionWeb = {
  linux: false,
  windows: false,
};

const checkIsNewVersion = async (
  buildType: "web" | "android" = "android",
): Promise<boolean> => {
  if (!versionExpo) {
    console.error("Version not found");
    process.exit(1);
  }

  try {
    const url = `${process.env.API_URL?.replace(
      "api",
      "updates",
    )}/is-update-available`;
    console.log("Checking for new version at URL:", url);
    if (buildType === "android") {
      const body: RequestIsUpdateAvailable<typeof buildType> = {
        buildType,
        platformOS: undefined,
        currentVersion: versionExpo,
      };
      const res = await axios.post<ResponseIsUpdateAvailable>(url, body, {
        timeout: 10000,
      });
      return isNewVersion(versionExpo, res.data?.latestVersion);
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
      const isNewForWindows = isNewVersion(
        versionExpo,
        res1.data?.latestVersion,
      );
      const isNewForLinux = isNewVersion(versionExpo, res2.data?.latestVersion);

      isNewVersionWeb.windows = isNewForWindows;
      isNewVersionWeb.linux = isNewForLinux;

      return isNewForWindows || isNewForLinux;
    }
  } catch (error) {
    console.error(
      "Error checking for new version:",
      error instanceof Error ? error.message : String(error),
    );
    return false;
  }
};

const uploadWeb = async (): Promise<boolean> => {
  try {
    console.log("Building web version:", versionExpo);

    const buildPath = path.join(
      UTILITIES_FOR_PC_PATH,
      "dist",
      "_expo",
      "static",
      "js",
      "web",
    );

    execSync("yarn run build-web-app-electron", {
      stdio: "inherit",
      cwd: UTILITIES_PATH,
    });
    if (!fs.existsSync(buildPath))
      throw new Error(`Build path not found at ${buildPath}`);

    const dirFiles = fs.readdirSync(buildPath);
    const fileJS = dirFiles.find((file) => file.endsWith(".js"));

    if (!fileJS)
      throw new Error(`Build file not found in directory ${buildPath}`);

    const buildFilePath = path.join(buildPath, fileJS);

    const platformsOS: PlatformsOS[] = [];
    if (isNewVersionWeb.windows) platformsOS.push("windows");
    if (isNewVersionWeb.linux) platformsOS.push("linux");

    const url = `${process.env.API_URL?.replace(
      "api",
      "updates",
    )}/upload-update`;
    console.log("Uploading updates to URL:", url);

    const uploadPromises = platformsOS.map(async (platformOS) => {
      try {
        const data: RequestUploadUpdate = {
          buildType: "web",
          platformOS,
          version: versionExpo,
        };

        console.log(`Uploading web build for ${platformOS}...`, data);

        const formData = new FormData();
        formData.append("data", JSON.stringify(data));
        formData.append("file", fs.createReadStream(buildFilePath));

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

        console.log(`Upload successful for ${platformOS}:`, response.data);
        return {
          platformOS,
          success: !response.data.error,
          data: response.data,
        };
      } catch (error) {
        console.error(`Failed to upload for ${platformOS}:`);
        console.error(error instanceof Error ? error.message : String(error));
        return {
          platformOS,
          success: false,
          error: error instanceof Error ? error.message : String(error),
        };
      }
    });

    const results = await Promise.all(uploadPromises);

    console.log("\n=== Upload Summary ===");
    const successCount = results.filter((r) => r.success).length;
    results.forEach((result) => {
      const status = result.success ? "Success" : "Failed";
      console.log(`${result.platformOS}: ${status}`);
      if (!result.success) {
        console.log(
          `  Error: ${result.data?.error || result?.error || "Unknown error"}`,
        );
      }
    });

    console.log(
      `\nTotal: ${successCount}/${results.length} successful uploads`,
    );

    if (successCount === 0) {
      throw new Error("All uploads failed");
    }
    return true;
  } catch (error) {
    console.error(
      "Fatal error:",
      error instanceof Error ? error.message : String(error),
    );
    return false;
  }
};

const uploadAndroidAssets = async () => {
  const BUILD_PROFILE = ARGS["BUILD_PROFILE"] || "production";

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
};

const run = async () => {
  const platformUpdateAssets = ARGS["platform-update-assets"] ?? "both";

  const isBoth = platformUpdateAssets === "both";
  const isWeb = isBoth || platformUpdateAssets === "web";
  const isAndroid = isBoth || platformUpdateAssets === "android";

  const isNewVersionWeb = isWeb && (await checkIsNewVersion("web"));

  if (isNewVersionWeb) await uploadWeb();

  if (isAndroid) await uploadAndroidAssets();
};
run();
