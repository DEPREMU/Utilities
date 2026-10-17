import path from "path";
import axios from "axios";
import chalk from "chalk";
import FormData from "form-data";
import { args } from "./arguments";
import { Script } from "./common";
import { Logger } from "@commonSrc/serverOrElectron/logger";
import { ZipArchive } from "archiver";
import { ServerError } from "@commonSrc/both/errors/Error";
import { Directory, File } from "@commonSrc/serverOrElectron";
import type { RequestUploadUpdate } from "@types";
import { ServerFetch, Validations } from "@commonSrc/both";

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
const logger = new Logger("Update");

const getAndroidVersion = async (): Promise<string> => {
  const configPath = path.join(script.PATHS.app, "app.config.ts");
  const content = await new File(configPath).readFile("utf-8");
  const match = content.match(/const\s+version\s*=\s*"([^"]+)"/);
  if (!match)
    throw new Error("Could not extract version from app/app.config.ts");
  return match[1];
};

const versionExpo = await getAndroidVersion();

const checkIsNewVersion = async (
  buildType: "web" | "android" = "android",
): Promise<boolean> => {
  try {
    const res = await ServerFetch.get(
      "/downloads/is-update-available/:version/:buildType",
      {
        params: {
          version: versionExpo,
          buildType,
        },
      },
    );

    if ("error" in res.data) throw new Error(ServerError.getMessage(res.data));

    return (
      !res.data.latestVersion ||
      Validations.isNewVersion(res.data.latestVersion, versionExpo)
    );
  } catch (error) {
    logger.error(
      "Error checking for new version:",
      error instanceof Error ? error.message : String(error),
    );
    return false;
  }
};

const uploadWeb = async (): Promise<boolean> => {
  try {
    logger.log("Building web version:", versionExpo);

    const build = new Directory(path.join(script.PATHS.utilitiesForPC, "dist"));

    if (!args.ARGS["testing"] || !(await build.exists())) {
      const exec = new script.Exec();

      exec.async.onData((chunk) => {
        logger.log(chalk.magentaBright("BUILD: "), chunk);
      });
      await exec.async.run("yarn run build-web-app-electron", {
        env: process.env,
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
      logger.log(
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

      logger.log(`Uploading web build...`, data);

      const formData = new FormData();
      formData.append("data", JSON.stringify(data));
      formData.append("file", zipFile.createStream.read());

      const contentLength = await new Promise<number>((resolve, reject) => {
        formData.getLength((err, length) => {
          if (err) reject(err);
          else resolve(length);
        });
      });

      const url = ServerFetch.getRoute("POST", "/downloads/upload");
      const response = await axios.post(url, formData, {
        headers: {
          ...formData.getHeaders(),
          "Content-Length": contentLength,
        },
        timeout: 60000,
        maxBodyLength: Infinity,
        maxContentLength: Infinity,
      });

      logger.log(`Upload successful:`, response.data);
      return true;
    } catch (error) {
      logger.error(`Failed to upload web build`, error);
      return false;
    }
  } catch (error) {
    logger.error(
      "Fatal error:",
      error instanceof Error ? error.message : String(error),
    );
    return false;
  }
};

const uploadAndroidAssets = async () => {
  const BUILD_PROFILE = args.ARGS.BUILD_PROFILE || "production";
  const rawMessage =
    args.ARGS.message ||
    process.env.COMMIT_MESSAGE ||
    `Release update ${versionExpo}`;
  const sanitizedMessage = rawMessage.replace(/["\r\n]+/g, " ").trim();

  const exec = new script.Exec();

  exec.async.onData((chunk) => {
    logger.log(chalk.blueBright("EAS UPDATE: "), chunk);
  });
  await exec.async.run(
    `eas update --branch ${BUILD_PROFILE} --platform android --message ${JSON.stringify(sanitizedMessage)}`,
    {
      cwd: script.PATHS.app,
      env: {
        ...process.env,
        PLATFORM: "android",
        EAS_BUILD: "true",
        BUILD_PROFILE,
      },
    },
  );
};

script.addStep("Verify that arguments are valid", async () => {
  if (args.ARGS.testing) {
    logger.log("Testing mode: Skipping update due to testing mode");
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

  logger.log("Web version is new, uploading web version...");
  await uploadWeb();
});

script.addStep("Upload Android assets if new", async () => {
  if (!platform.android) return;
  if (!isNewVersion.android) return;

  logger.log("Android assets are new, uploading Android assets...");
  await uploadAndroidAssets();
});

if (process.env.NODE_ENV !== "test") script.run();

export { script };
