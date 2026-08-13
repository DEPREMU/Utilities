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
import { Logger } from "@commonSrc/serverOrElectron/logger.ts";
import { execSync } from "child_process";
import { ZipArchive } from "archiver";
import type { RequestUploadUpdate } from "@types";
import { ServerFetch, Validations } from "@commonSrc/both/index.ts";

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
    if (buildType === "android") {
      const res = await ServerFetch.get(
        "/updates/is-update-available/:version/:buildType",
        {
          params: {
            buildType,
            version: versionExpo,
          },
        },
      );
      return Validations.isNewVersion(versionExpo, res.data?.latestVersion);
    } else {
      const [resLinux, resWindows] = await Promise.all([
        ServerFetch.get("/updates/is-update-available/:version/:buildType", {
          params: {
            version: versionExpo,
            buildType: "linux",
          },
        }),
        ServerFetch.get("/updates/is-update-available/:version/:buildType", {
          params: {
            version: versionExpo,
            buildType: "windows",
          },
        }),
      ]);
      const isNewForWindows = Validations.isNewVersion(
        versionExpo,
        resLinux.data?.latestVersion,
      );
      const isNewForLinux = Validations.isNewVersion(
        versionExpo,
        resWindows.data?.latestVersion,
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

    if (args.ARGS["testing"]) {
      Logger.log(
        "Testing mode enabled - skipping actual upload. Zip file created at:",
        zipPath,
      );
      return true;
    }

    try {
      const data: RequestUploadUpdate = {
        version: versionExpo,
        buildType: "web",
      };

      Logger.log(`Uploading web build...`, data);

      const formData = new FormData();
      formData.append("data", JSON.stringify(data));
      formData.append("file", fs.createReadStream(zipPath));

      const contentLength = await new Promise<number>((resolve, reject) => {
        formData.getLength((err, length) => {
          if (err) reject(err);
          else resolve(length);
        });
      });

      const url = ServerFetch.getRoute("POST", "/updates/upload");
      const response = await axios.post(url, formData, {
        headers: {
          ...formData.getHeaders(),
          "Content-Length": contentLength,
        },
        timeout: 60000,
        maxBodyLength: Infinity,
        maxContentLength: Infinity,
      });

      Logger.log(`Upload successful:`, response.data);
      return true;
    } catch (error) {
      Logger.error(`Failed to upload web build`, error);
      return false;
    }
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
