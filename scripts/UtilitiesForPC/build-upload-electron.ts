import {
  args,
  UTILITIES_PATH,
  versionElectron,
  UTILITIES_FOR_PC_PATH,
} from "../config.ts";
import path from "path";
import axios from "axios";
import FormData from "form-data";
import { File } from "@commonSrc/serverOrElectron/fs.ts";
import { Script } from "../common.ts";
import { Logger } from "@commonSrc/serverOrElectron/logger.ts";
import { ServerFetch } from "@commonSrc/both/index.ts";
import type { Enums, RequestUploadUpdate } from "@types";
import chalk from "chalk";

let isNewVersionLinux: boolean;
let isNewVersionWindows: boolean;

const isNewVersionPlatform = async (buildType: Enums["UpdateType"]) => {
  try {
    const res = await ServerFetch.get(
      "/updates/is-update-available/:version/:buildType",
      {
        params: {
          version: versionElectron,
          buildType,
        },
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

Logger.log("=== Electron Build and Upload Process ===\n");

const script = new Script();

script.addStep("Check Platform", async () => {
  if (script.PLATFORM.isWindows) {
    isNewVersionWindows = await isNewVersionPlatform("windows");
  } else {
    isNewVersionLinux = await isNewVersionPlatform("linux");
  }
});

if (!args.ARGS["skip-build-electron"])
  script.addStep("Build Electron App", async (_, abortController) => {
    const platform = script.PLATFORM.isWindows ? "windows" : "linux";

    const ARGS = args.getArgs();
    const exec = new script.Exec();

    await exec.async
      .onData((chunk) => {
        Logger.log(chalk.blueBright("Build Electron App: "), chunk);
      })
      .run(
        `yarn run build-app-electron ${
          ARGS.includes("platform") ? ARGS : `${ARGS} --platform=${platform}`
        }`,
        {
          cwd: UTILITIES_PATH,
          signal: abortController.signal,
        },
      );
  });

script.addStep("Check if there are new versions", async () => {
  if (!isNewVersionLinux && !isNewVersionWindows) {
    Logger.log(
      "No new version available for either platform. Exiting without uploading.",
    );
    throw new Error("No new version available for either platform");
  }
});

script.addStep("Check if server is alive", async () => {
  const isAlive = await ServerFetch.isServerAlive();
  if (!isAlive)
    throw new Error(
      `Server is not alive, check connection and env API_URL=${ServerFetch.API_URL}`,
    );
});

script.addStep(`Check if there are Electron build files`, async () => {
  const distElectron = new script.Directory(
    path.join(UTILITIES_FOR_PC_PATH, "dist-electron"),
  );

  if (!(await distElectron.exists()))
    throw new Error(`Electron dist directory not found at ${distElectron}`);
});

script.addStep("Upload Electron Builds", async () => {
  Logger.log("Uploading Electron builds, version:", versionElectron);

  const distElectron = new script.Directory(
    path.join(UTILITIES_FOR_PC_PATH, "dist-electron"),
  );

  const files = await distElectron.readDir();

  const linuxDebFile = files.find((file) => file.endsWith(".deb"));
  const windowsExeFile = files.find((file) => file.endsWith(".exe"));

  const availablePlatforms: Array<{
    file: File;
    buildType: Enums["UpdateType"];
  }> = [];

  if (linuxDebFile && isNewVersionLinux) {
    availablePlatforms.push({
      file: new script.File(path.join(distElectron.path, linuxDebFile)),
      buildType: "linux",
    });
  }

  if (windowsExeFile && isNewVersionWindows) {
    availablePlatforms.push({
      file: new script.File(path.join(distElectron.path, windowsExeFile)),
      buildType: "windows",
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
      .map((p) => `${p.buildType} (${path.basename(p.file.path)})`)
      .join(", "),
  );

  const uploadPromises = availablePlatforms.map(async ({ buildType, file }) => {
    try {
      if (!(buildType === "linux" ? isNewVersionLinux : isNewVersionWindows)) {
        return {
          buildType,
          success: false,
          error: `Version ${versionElectron} already exists on the server for ${buildType}`,
        };
      }
      const data: RequestUploadUpdate = {
        buildType,
        version: versionElectron,
      };

      Logger.log(
        `Uploading ${buildType} build: ${path.basename(file.path)}...`,
        data,
      );

      const formData = new FormData();
      formData.append("data", JSON.stringify(data));
      formData.append("file", file.createStream.read());

      const contentLength = await new Promise<number>((resolve, reject) => {
        formData.getLength((err, length) => {
          if (err) reject(err);
          else resolve(length);
        });
      });

      const response = await axios.post(
        ServerFetch.getRoute("POST", "/updates/upload"),
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

      Logger.log(`Upload successful for ${buildType}:`, response.data);
      return {
        buildType,
        success: !response.data?.error,
        data: response.data,
      };
    } catch (error) {
      Logger.error(`Failed to upload ${buildType} build:`);
      Logger.error(error instanceof Error ? error.message : String(error));
      return {
        buildType,
        success: false,
        error: error instanceof Error ? error.message : String(error),
      };
    }
  });

  const results = await Promise.all(uploadPromises);

  Logger.log("\n=== Electron Upload Summary ===");
  const successCount = results.filter((r) => r.success).length;
  results.forEach((result) => {
    const status = result.success ? "Success" : "Failed";
    Logger.log(`${result.buildType}: ${status}`);
    if (!result.success && "error" in result) {
      Logger.log(`  Error: ${result.error}`);
    }
  });

  Logger.log(`\nTotal: ${successCount}/${results.length} successful uploads`);

  if (successCount === 0) {
    throw new Error("All Electron uploads failed");
  }

  Logger.log("\nElectron builds uploaded successfully!");
});

script.run();
