import type {
  PlatformsOS,
  RequestUploadUpdate,
  RequestIsUpdateAvailable,
  ResponseIsUpdateAvailable,
} from "./../types/";
import fs from "fs";
import path from "path";
import axios from "axios";
import FormData from "form-data";
import { execSync } from "child_process";
import { isNewVersion, versionExpo } from "./config.ts";

const args = process.argv.slice(2);

const checkIsNewVersion = async () => {
  if (!versionExpo) {
    console.error("Version not found");
    process.exit(1);
  }

  try {
    const url = `${process.env.API_URL?.replace(
      "api",
      "updates"
    )}/is-update-available`;
    console.log("Checking for new version at URL:", url);
    const body: RequestIsUpdateAvailable = {
      buildType: "web",
      platformOS: "windows",
      currentVersion: versionExpo,
    };
    const res = await axios.post<ResponseIsUpdateAvailable>(url, body, {
      timeout: 10000,
    });
    const data = res.data;
    if (!isNewVersion(versionExpo, data.latestVersion)) return;
    console.log("Your version is the same as the server:", data.latestVersion);
    return true;
  } catch (error) {
    console.error(
      "Error checking for new version:",
      error instanceof Error ? error.message : String(error)
    );
  }
  return false;
};

const uploadWeb = async (): Promise<boolean> => {
  try {
    if (!(await checkIsNewVersion())) return false;
    console.log("Building web version:", versionExpo);

    const buildPath = path.join(
      process.cwd(),
      "UtilitiesForPC",
      "dist",
      "index.html"
    );

    execSync("npm run build-web", {
      stdio: "inherit",
      cwd: path.join(process.cwd(), "UtilitiesForPC"),
    });
    if (!fs.existsSync(buildPath)) {
      throw new Error(`Build file not found at ${buildPath}`);
    }

    const platformsOS: PlatformsOS[] = ["windows", "linux"];
    const url = `${process.env.API_URL?.replace(
      "api",
      "updates"
    )}/upload-update`;
    console.log("Uploading updates to URL:", url);

    const uploadPromises = platformsOS.map(async (platformOS) => {
      try {
        const data: RequestUploadUpdate = {
          buildType: "web",
          platformOS,
          timestamp: Date.now(),
          version: versionExpo,
        };

        console.log(`Uploading web build for ${platformOS}...`, data);

        const formData = new FormData();
        formData.append("data", JSON.stringify(data));
        formData.append("file", fs.createReadStream(buildPath));

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
          `  Error: ${result.data?.error || result?.error || "Unknown error"}`
        );
      }
    });

    console.log(
      `\nTotal: ${successCount}/${results.length} successful uploads`
    );

    if (successCount === 0) {
      throw new Error("All uploads failed");
    }
    return true;
  } catch (error) {
    console.error(
      "Fatal error:",
      error instanceof Error ? error.message : String(error)
    );
    return false;
  }
};

const uploadAndroidAssets = async () => {
  execSync("npm run update", {
    stdio: "inherit",
    cwd: path.join(process.cwd(), "app"),
  });
};

const run = async () => {
  const onlyAndroid = args.includes("--only-android") || args.includes("-a");
  if (onlyAndroid) {
    console.log("Uploading only Android assets...");
    await uploadAndroidAssets();
    return;
  }
  if (await uploadWeb()) await uploadAndroidAssets();
};
run();
