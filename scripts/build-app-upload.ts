import type {
  PlatformsOS,
  RequestUploadUpdate,
  RequestIsUpdateAvailable,
} from "./../types/";
import fs from "fs";
import path from "path";
import axios from "axios";
import dotenv from "dotenv";
import FormData from "form-data";
import { execSync } from "child_process";
import type UtilitiesPackageJson from "../UtilitiesForPC/package.json";

dotenv.config();
if (!process.env.API_URL) {
  console.error("API_URL is not defined in environment variables.");
  process.exit(1);
}

const version = JSON.parse(
  fs.readFileSync(
    path.join(process.cwd(), "UtilitiesForPC", "package.json"),
    "utf-8"
  )
) as typeof UtilitiesPackageJson;

if (!version.version) {
  console.error("Version not found in UtilitiesForPC/package.json.");
  process.exit(1);
}

const checkIsNewVersion = async () => {
  try {
    const body: RequestIsUpdateAvailable = {
      buildType: "electron",
      currentVersion: version.version,
      platformOS: "windows",
    };

    const res = await fetch(
      process.env.API_URL?.replace("api", "updates/is-update-available")!,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(body),
      }
    );

    const result = (await res.json()) as {
      updateAvailable: boolean;
      latestVersion: string;
      downloadUrl: string;
    };

    if (result.latestVersion === version.version) {
      console.log("Version already exists on the server.");
      process.exit(0);
    }
  } catch (error) {
    console.error(
      "Error checking for new version:",
      error instanceof Error ? error.message : String(error)
    );
  }
};

const uploadElectronBuilds = async () => {
  try {
    console.log("Uploading Electron builds, version:", version.version);

    if (!version.version) throw new Error("Version not found in package.json");
    const distElectronPath = path.join(
      process.cwd(),
      "UtilitiesForPC",
      "dist-electron"
    );

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

    if (linuxDebFile) {
      availablePlatforms.push({
        platformOS: "linux",
        file: path.join(distElectronPath, linuxDebFile),
      });
    }

    if (windowsExeFile) {
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
          const data: RequestUploadUpdate = {
            buildType: "electron",
            platformOS,
            timestamp: Date.now(),
            version: version.version,
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
            process.env.API_URL?.replace("api", "updates/upload-update"),
            formData,
            {
              headers: {
                ...formData.getHeaders(),
                "Content-Length": contentLength,
              },
              maxContentLength: Infinity,
              maxBodyLength: Infinity,
              timeout: 600000,
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

  const utilitiesForPCPath = path.join(process.cwd(), "UtilitiesForPC");

  if (!fs.existsSync(utilitiesForPCPath)) {
    throw new Error(
      `UtilitiesForPC directory not found at ${utilitiesForPCPath}`
    );
  }

  const args = process.argv.slice(2);
  const platformArg = args.find(
    (arg) => arg.startsWith("--platform=") || arg.startsWith("-p=")
  );
  const platform = platformArg ? platformArg.split("=")[1] : "both";

  console.log(`Building Electron app for platform: ${platform}`);

  execSync(`npm run build-app -- --platform=${platform}`, {
    cwd: utilitiesForPCPath,
    stdio: "inherit",
  });

  console.log("Electron app build completed!");
};

console.log("=== Electron Build and Upload Process ===\n");

checkIsNewVersion().then(() => {
  buildElectronApp();
  uploadElectronBuilds().catch((error) => {
    console.error("Process failed:", error);
    process.exit(1);
  });
});
