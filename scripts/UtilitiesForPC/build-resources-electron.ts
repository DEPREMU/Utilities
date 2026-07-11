/* eslint-disable no-console */
import {
  args,
  versionExpo,
  COMMON_PATH,
  versionElectron,
  UTILITIES_FOR_PC_PATH,
} from "../config.ts";
import fs from "fs";
import os from "os";
import path from "path";
import { build } from "esbuild";
import { pluginReplace } from "@espcom/esbuild-plugin-replace";
import type { BuildOptions } from "esbuild";

let isWindows = os.platform() === "win32";

if (typeof args.ARGS.isWindows === "boolean") {
  console.log(
    `Building for platform ${args.ARGS.isWindows ? "Windows" : "Linux"} as specified in arguments.`,
  );
  isWindows = args.ARGS.isWindows;
}

const baseConfig: BuildOptions = {
  bundle: true,
  minify: true,
  format: "cjs",
  platform: "node",
  legalComments: "none",
};

const BUILD_PROFILE = args.ARGS.BUILD_PROFILE || "production";

build({
  ...baseConfig,
  outfile: path.join(UTILITIES_FOR_PC_PATH, "build", "preload.cjs"),
  platform: "browser",
  external: ["electron"],
  entryPoints: [path.join(UTILITIES_FOR_PC_PATH, "src", "preload", "index.ts")],
  plugins: [
    pluginReplace([
      {
        filter: /\.ts|\.js$/,
        replace: /process\.env\.BUILD_PROFILE/g,
        replacer: () => JSON.stringify(BUILD_PROFILE),
      },
      ...(BUILD_PROFILE !== "production"
        ? []
        : [
            {
              filter: /\.ts|\.js$/,
              replace: /sendLog\(/g,
              replacer: () => "(() => {})(",
            },
          ]),
    ]),
  ],
}).catch((err: unknown) => {
  console.error("Preload build failed", err);
  process.exit(1);
});

build({
  ...baseConfig,
  outfile: path.join(UTILITIES_FOR_PC_PATH, "build", "index.cjs"),
  external: [
    "pino",
    "sharp",
    "pdfkit",
    "node-7z",
    "piscina",
    "7zip-bin",
    "archiver",
    "electron",
    "unzipper",
    "bonjour-service",
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

const piscinaCommonPath = path.join(COMMON_PATH, "serverOrElectron", "piscina");

const piscinaCallback = (
  err: Error | null,
  files: string[],
  defaultPath: string,
) => {
  if (err) {
    console.error("Error reading piscina utils directory:", err);
    return;
  }

  files.forEach((file) => {
    if (!file.endsWith(".ts")) return;

    const srcPath = path.join(defaultPath, file);
    const destPath = path.join(
      UTILITIES_FOR_PC_PATH,
      "build",
      "piscina",
      file.replace(".ts", ".cjs"),
    );
    build({
      ...baseConfig,
      outfile: destPath,
      external: ["pino", "sharp"],
      entryPoints: [srcPath],
    }).catch((err: unknown) => {
      console.error(`Build failed for ${file}:`, err);
    });
  });
};

fs.readdir(piscinaCommonPath, (...args) =>
  piscinaCallback(...args, piscinaCommonPath),
);
