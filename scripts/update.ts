import path from "path";
import axios from "axios";
import chalk from "chalk";
import FormData from "form-data";
import { args } from "./arguments";
import { Script } from "./common";
import { Logger } from "@commonSrc/serverOrElectron/logger.ts";
import { ZipArchive } from "archiver";
import { ServerFetch } from "@commonSrc/both/index.ts";
import { Directory, File } from "@commonSrc/serverOrElectron";
import type { RequestUploadUpdate } from "@types";

const platform = {
  web: false,
  both: false,
  android: false,
};

const isNewVersion = {
  web: false,
  android: false,
};

const script = new Script();

const versionExpo = await script
  .getPackageJson("utilitiesForPC")
  .then((p) => p.version);

const checkIsNewVersion = async (
  buildType: "web" | "android" = "android",
): Promise<boolean> => {
  try {
    const res = await ServerFetch.get(
      "/updates/is-update-available/:version/:buildType",
      {
        params: {
          version: versionExpo,
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
    return false;
  }
};

const uploadWeb = async (): Promise<boolean> => {
  try {
    Logger.log("Building web version:", versionExpo);

    const build = new Directory(path.join(script.PATHS.utilitiesForPC, "dist"));

    if (!args.ARGS["testing"] || !(await build.exists())) {
      const exec = new script.Exec();

      exec.async.onData((chunk) => {
        Logger.log(chalk.magentaBright("BUILD: "), chunk);
      });
      await exec.async.run("yarn run build-web-app-electron", {
        cwd: script.PATHS.root,
      });
    }
    if (!(await build.exists()))
      throw new Error(`Build path not found at ${build.path}`);

    const dirFiles = await build.readDir.withFileTypes();

    const zipFile = new File(
      path.join(script.PATHS.utilitiesForPC, "dist", "temp_web_build.zip"),
    );
    const output = zipFile.createStream.write();

    const zip = new ZipArchive({
      zlib: { level: 9 },
    });
    zip.pipe(output);

    dirFiles.forEach((file) => {
      if (file.isFile()) {
        const filePath = path.join(build.path, file.name);
        zip.file(filePath, { name: file.name });
      } else if (file.isDirectory()) {
        const dirPath = path.join(build.path, file.name);
        zip.directory(dirPath, file.name);
      }
    });

    await zip.finalize();

    if (!(await zipFile.exists()))
      throw new Error(`Zip file not found at ${zipFile.path}`);

    if (args.ARGS["testing"]) {
      Logger.log(
        "Testing mode enabled - skipping actual upload. Zip file created at:",
        zipFile,
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
      formData.append("file", zipFile.createStream.read());

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
  const BUILD_PROFILE = args.ARGS.BUILD_PROFILE || "production";

  const exec = new script.Exec();

  exec.async.onData((chunk) => {
    Logger.log(chalk.blueBright("EAS UPDATE: "), chunk);
  });
  await exec.async.run("eas update", {
    cwd: script.PATHS.app,
    env: {
      ...process.env,
      PLATFORM: "android",
      EAS_BUILD: "true",
      BUILD_PROFILE,
    },
  });
};

script.addStep("Verify that arguments are valid", async () => {
  if (args.ARGS.testing) {
    Logger.log("Testing mode: Skipping update due to testing mode");
    return;
  }

  const platformUpdateAssets = args.ARGS["platform-update-assets"] ?? "both";

  platform.both = platformUpdateAssets === "both";
  platform.web = platform.both || platformUpdateAssets === "web";
  platform.android = platform.both || platformUpdateAssets === "android";

  if (!platform.both && !platform.web && !platform.android)
    throw new Error("Invalid platform-update-assets argument");
});

script.addStep("Check if there is a new version", async () => {
  if (platform.web) isNewVersion.web = await checkIsNewVersion("web");

  if (platform.android)
    isNewVersion.android = await checkIsNewVersion("android");
});

script.addStep("Upload web version if new", async () => {
  if (!platform.web) return;
  if (!isNewVersion.web) return;

  Logger.log("Web version is new, uploading web version...");
  await uploadWeb();
});

script.addStep("Upload Android assets if new", async () => {
  if (!platform.android) return;
  if (!isNewVersion.android) return;

  Logger.log("Android assets are new, uploading Android assets...");
  await uploadAndroidAssets();
});

if (process.env.NODE_ENV !== "test") script.run();

export { script };
