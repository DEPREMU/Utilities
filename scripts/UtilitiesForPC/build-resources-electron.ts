import {
  ARGS,
  versionExpo,
  versionElectron,
  UTILITIES_FOR_PC_PATH,
} from "../config.ts";
import os from "os";
import path from "path";
import { build } from "esbuild";
import { pluginReplace } from "@espcom/esbuild-plugin-replace";
import type { BuildOptions } from "esbuild";

let isWindows = os.platform() === "win32";

if (typeof ARGS["isWindows"] === "boolean") {
  console.log(
    `Building for platform ${ARGS["isWindows"] ? "Windows" : "Linux"} as specified in arguments.`
  );
  isWindows = ARGS["isWindows"];
}

const baseConfig: BuildOptions = {
  bundle: true,
  minify: true,
  format: "cjs",
  legalComments: "none",
};

build({
  ...baseConfig,
  outfile: path.join(UTILITIES_FOR_PC_PATH, "build", "preload.cjs"),
  platform: "browser",
  external: ["electron"],
  entryPoints: [path.join(UTILITIES_FOR_PC_PATH, "src", "preload.ts")],
  plugins: [
    pluginReplace([
      {
        filter: /\.ts|\.js$/,
        replace: /process\.env\.BUILD_PROFILE/g,
        replacer: () => JSON.stringify(ARGS["profile"] || "production"),
      },
    ]),
  ],
}).catch((err: unknown) => {
  console.error("Preload build failed", err);
  process.exit(1);
});

build({
  ...baseConfig,
  outfile: path.join(UTILITIES_FOR_PC_PATH, "build", "index.cjs"),
  platform: "node",
  external: [
    "dnssd",
    "sharp",
    "node-7z",
    "7zip-bin",
    "electron",
    "electron-edge-js",
  ],
  entryPoints: [path.join(UTILITIES_FOR_PC_PATH, "src", "main", "index.ts")],
  plugins: [
    pluginReplace([
      {
        filter: /\.ts|\.js$/,
        replace: /[a-zA-Z_]+\.getValue\([\n\s]*"isWindows"[\n\s]*\)/g,
        replacer: () => JSON.stringify(isWindows),
      },
      {
        filter: /\.ts|\.js$/,
        replace: /process\.env\.API_URL/g,
        replacer: () => JSON.stringify(process.env.API_URL),
      },
      {
        filter: /\.ts|\.js$/,
        replace: /{{ELECTRON_VERSION}}/g,
        replacer: () => versionElectron,
      },
      {
        filter: /\.ts|\.js$/,
        replace: /{{WEB_VERSION}}/g,
        replacer: () => versionExpo,
      },
      {
        filter: /\.ts|\.js$/,
        replace: /process\.env\.SERVER_OR_ELECTRON/g,
        replacer: () => JSON.stringify("electron"),
      },
    ]),
  ],
}).catch((err: unknown) => {
  console.error("Build failed:", err);
  process.exit(1);
});
