/* eslint-disable no-console */
import {
  externalWorkers,
  externalElectron,
  REPLACERS_PLUGIN,
} from "@commonSrc/serverOrElectron/build.ts";
import fs from "fs";
import os from "os";
import path from "path";
import { args } from "../arguments";
import { build } from "esbuild";
import { Script } from "../common";
import { pluginReplace } from "@espcom/esbuild-plugin-replace";
import type { BuildOptions } from "esbuild";

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

const baseConfig: BuildOptions = {
  bundle: true,
  minify: BUILD_PROFILE !== "development",
  format: "cjs",
  platform: "node",
  legalComments: "none",
};

build({
  ...baseConfig,
  outfile: path.join(script.PATHS.utilitiesForPC, "build", "preload.cjs"),
  platform: "browser",
  external: ["electron"],
  entryPoints: [
    path.join(script.PATHS.utilitiesForPC, "src", "preload", "index.ts"),
  ],
  plugins: [
    pluginReplace([
      ...REPLACERS_PLUGIN,
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
  outfile: path.join(script.PATHS.utilitiesForPC, "build", "index.cjs"),
  external: externalElectron,
  entryPoints: [
    path.join(script.PATHS.utilitiesForPC, "src", "main", "index.ts"),
  ],
  plugins: [
    pluginReplace([
      ...REPLACERS_PLUGIN,
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
    ]),
  ],
}).catch((err: unknown) => {
  console.error("Build failed:", err);
  process.exit(1);
});

const piscinaCommonPath = path.join(
  script.PATHS.common,
  "serverOrElectron",
  "piscina",
);

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
      script.PATHS.utilitiesForPC,
      "build",
      "piscina",
      file.replace(".ts", ".cjs"),
    );
    build({
      ...baseConfig,
      outfile: destPath,
      external: externalWorkers,
      entryPoints: [srcPath],
    }).catch((err: unknown) => {
      console.error(`Build failed for ${file}:`, err);
    });
  });
};

fs.readdir(piscinaCommonPath, (...args) =>
  piscinaCallback(...args, piscinaCommonPath),
);
