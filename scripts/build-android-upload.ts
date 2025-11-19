import type {
  RequestUploadUpdate,
  RequestIsUpdateAvailable,
} from "./../types/";
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

/**
 * Uploads Android APK build to the update server.
 * Builds the APK using EAS and uploads it to the server.
 * Usage: node build-android-upload.ts [profile]
 * Profiles: development, preview, production (default: production)
 */

const prevGitignore = fs.readFileSync(
  path.join(path.resolve(), ".gitignore"),
  "utf-8"
);
fs.writeFileSync(
  path.join(path.resolve(), ".gitignore"),
  prevGitignore.replace("android/", "")
);

const urlUpdates = process.env.API_URL?.replace("api", "updates/");

if (!urlUpdates) {
  console.error("API_URL is not defined in environment variables.");
  process.exit(1);
}

const version = fs
  ?.readFileSync(path.join(process.cwd(), "app", "app.config.js"), "utf-8")
  ?.match(/const version[^\n]*/g)?.[0]
  ?.split('"')[1];
if (!version) throw new Error("Version not found in app.config.js");

const checkIsNewVersion = async () => {
  try {
    const body: RequestIsUpdateAvailable<"android"> = {
      buildType: "android",
      currentVersion: version,
      platformOS: undefined,
    };

    const res = await fetch(urlUpdates + "is-update-available", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(body),
    });

    const result = (await res.json()) as {
      updateAvailable: boolean;
      latestVersion: string;
      downloadUrl: string;
    };
    console.log("Latest version on server:", result);

    if (result.latestVersion === version) {
      console.log("Version already exists on the server.");
      process.exit(0);
    }
  } catch (error) {
    console.error("Error checking for new version:", error);
    process.exit(1);
  }
};

const uploadAndroidBuild = async () => {
  try {
    const url = process.env.API_URL?.replace("api", "updates/upload-update");

    if (!url)
      throw new Error("API_URL is not defined in environment variables.");

    console.log("Uploading Android build, version:", version);
    console.log(`Uploading to URL: ${url}`);

    const appBuildsPath = path.join(process.cwd(), "app", "builds");

    if (!fs.existsSync(appBuildsPath)) {
      throw new Error(`Android builds directory not found at ${appBuildsPath}`);
    }

    const files = fs.readdirSync(appBuildsPath);
    const apkFile = files.find((file) => file.endsWith(".apk"));

    if (!apkFile) {
      throw new Error("No APK file found in app/builds/");
    }

    const apkPath = path.join(appBuildsPath, apkFile);
    console.log(`Found APK: ${apkFile}`);

    const data: RequestUploadUpdate = {
      buildType: "android",
      version,
      timestamp: Date.now(),
      platformOS: undefined,
    };

    console.log(`Uploading Android build...`, data);

    const formData = new FormData();
    formData.append("data", JSON.stringify(data));
    formData.append("file", fs.createReadStream(apkPath));

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
    });

    console.log("Upload successful:", response.data);

    if (response.data.error) {
      throw new Error(`Upload failed: ${response.data.error}`);
    }

    console.log("\nAndroid build uploaded successfully!");
  } catch (error) {
    console.error(
      "Fatal error during Android upload:",
      error instanceof Error ? error.message : String(error)
    );
    process.exit(1);
  }
};

const buildAndroidApp = () => {
  console.log("Starting Android app build process...");

  const appPath = path.join(process.cwd(), "app");

  if (!fs.existsSync(appPath)) {
    throw new Error(`App directory not found at ${appPath}`);
  }

  const args = process.argv.slice(2);
  const profileArg = args.find(
    (arg) => arg.startsWith("--profile=") || arg.startsWith("-p=")
  );
  const profile = profileArg ? profileArg.split("=")[1] : "production";

  const validProfiles = ["development", "preview", "production"];
  if (!validProfiles.includes(profile)) {
    throw new Error(
      `Invalid profile: ${profile}. Valid profiles: ${validProfiles.join(", ")}`
    );
  }

  console.log(`Building Android app with profile: ${profile}\n`);

  const env = {
    ...process.env,
    PLATFORM: "android",
    EAS_BUILD: "false",
    BUILD_PROFILE: profile,
  };

  try {
    console.log("Cleaning previous Android build...");
    const androidPath = path.join(appPath, "android");

    if (fs.existsSync(androidPath)) {
      execSync("npx rimraf android", { cwd: appPath, stdio: "inherit" });
    }

    console.log("\nRunning prebuild...");
    execSync("npm run prebuild", { cwd: appPath, stdio: "inherit", env });

    env.EAS_BUILD = "true";

    console.log(`\nBuilding APK with EAS (profile: ${profile})...`);
    console.log(
      "Note: This may take several minutes depending on your system...\n"
    );

    execSync(
      `taskset -c 0-5 npx eas build --platform android --profile ${profile} --local --output=./builds/android.apk`,
      { cwd: appPath, stdio: "inherit", env }
    );

    console.log("\nAndroid app build completed!");

    if (profile === "development") {
      const installAnswer = process.argv.includes("--install");
      if (installAnswer) {
        console.log("\nInstalling APK on connected device...");
        execSync("adb install -r ./builds/android.apk", {
          cwd: appPath,
          stdio: "inherit",
        });
        console.log("APK installed successfully!");
      }
    }
  } catch (error) {
    console.error(
      "\nAndroid build failed:",
      error instanceof Error ? error.message : String(error)
    );
    throw error;
  }
};

console.log("=== Android Build and Upload Process ===\n");

const handleClose = () => {
  fs.writeFileSync(path.join(path.resolve(), ".gitignore"), prevGitignore);
  process.exit(0);
};

process.on("SIGINT", () => {
  console.log("\nProcess interrupted. Exiting...");
  handleClose();
});
process.on("exit", handleClose);
process.on("uncaughtException", handleClose);
process.on("unhandledRejection", (reason) => {
  console.error("Unhandled Rejection:", reason);
  handleClose();
});
process.on("SIGTERM", () => {
  console.log("\nProcess terminated. Exiting...");
  handleClose();
});

checkIsNewVersion().then(() => {
  buildAndroidApp();
  uploadAndroidBuild().catch((error) => {
    console.error("Process failed:", error);
    process.exit(1);
  });
});
