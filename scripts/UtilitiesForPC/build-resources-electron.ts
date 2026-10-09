/* eslint-disable no-console */
import os from "os";
import { args } from "../arguments";
import { Script } from "../common";
import { execSync } from "child_process";

let isWindows = os.platform() === "win32";

const script = new Script();

if (typeof args.ARGS.isWindows === "boolean") {
  console.log(
    `Building for platform ${args.ARGS.isWindows ? "Windows" : "Linux"} as specified in arguments.`,
  );
  isWindows = args.ARGS.isWindows;
}

const BUILD_PROFILE =
  args.ARGS.BUILD_PROFILE || process.env.BUILD_PROFILE || "production";
const versionElectron = await script
  .getPackageJson("utilitiesForPC")
  .then((p) => p.version);
const versionExpo = script.appConfig.version;

if (!versionElectron || !versionExpo) {
  throw new Error("Failed to get versions");
}

console.log(
  `[electron-vite] Compiling desktop resources for ${isWindows ? "Windows" : "Linux"} (Profile: ${BUILD_PROFILE})...`,
);

try {
  execSync("yarn electron-vite build", {
    cwd: script.PATHS.utilitiesForPC,
    env: {
      ...process.env,
      BUILD_PROFILE,
      WEB_VERSION: versionExpo,
      ELECTRON_VERSION: versionElectron,
      BUILD_IS_WINDOWS: String(isWindows),
    },
    stdio: "inherit",
  });
  console.log("[electron-vite] Build completed successfully.");
} catch (error) {
  console.error("[electron-vite] Build failed:", error);
  process.exit(1);
}
