import type { RequestUploadUpdate, PlatformsOS } from "./../types/";
import fs from "fs";
import path from "path";
import axios from "axios";
import dotenv from "dotenv";
import FormData from "form-data";
import { execSync } from "child_process";

dotenv.config();
if (!process.env.API_URL) {
  console.error("API_URL is not defined in environment variables.");
  process.exit(1);
}

const uploadWeb = async () => {
  try {
    const version = fs
      .readFileSync(path.join(process.cwd(), "app", "app.config.js"), "utf-8")
      .match(/const version[^\n]*/g)?.[0]
      .split('"')[1];

    console.log("Building web version:", version);

    if (!version) throw new Error("Version not found");

    const buildPath = path.join(
      process.cwd(),
      "UtilitiesForPC",
      "dist",
      "index.html"
    );

    if (!fs.existsSync(buildPath)) {
      throw new Error(`Build file not found at ${buildPath}`);
    }

    const platformsOS: PlatformsOS[] = ["windows", "linux"];

    const uploadPromises = platformsOS.map(async (platformOS) => {
      try {
        const data: RequestUploadUpdate = {
          buildType: "web",
          platformOS,
          timestamp: Date.now(),
          version,
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

        const response = await axios.post(
          `${process.env.API_URL?.replace("api", "")}/updates/upload-update`,
          formData,
          {
            headers: {
              ...formData.getHeaders(),
              "Content-Length": contentLength,
            },
            maxContentLength: Infinity,
            maxBodyLength: Infinity,
            timeout: 60000,
          }
        );

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
        console.log(`  Error: ${result.data.error}`);
      }
    });

    console.log(
      `\nTotal: ${successCount}/${results.length} successful uploads`
    );

    if (successCount === 0) {
      throw new Error("All uploads failed");
    }
  } catch (error) {
    console.error(
      "Fatal error:",
      error instanceof Error ? error.message : String(error)
    );
    process.exit(1);
  }
};

const uploadAndroidAssets = async () => {
  execSync("cd app; npm run update", { stdio: "inherit", cwd: process.cwd() });
};

uploadWeb().then(() => uploadAndroidAssets());
