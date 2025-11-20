import fs from "fs";
import os from "os";
import path from "path";
import dotenv from "dotenv";
import { build } from "esbuild";
import type PackageJson from "../package.json";
import { pluginReplace } from "@espcom/esbuild-plugin-replace";
import type { BuildOptions } from "esbuild";

const UTILITIES_PATH = path.join(process.cwd(), "..");

dotenv.config({ path: path.join(UTILITIES_PATH, ".env") });

if (!process.env.API_URL) {
  throw new Error("API_URL is not defined in environment variables");
}

const packageJson: typeof PackageJson = JSON.parse(
  fs.readFileSync(
    path.join(UTILITIES_PATH, "UtilitiesForPC", "package.json"),
    "utf-8"
  )
);
const expoVersion = fs
  .readFileSync(path.join(UTILITIES_PATH, "app", "app.config.js"), "utf-8")
  .match(/const version[^\n]*/g)?.[0]
  .split('"')[1];

const args = process.argv.slice(2);

let isWindows = os.platform() === "win32";

if (args.includes("--isWindows") || args.includes("-w")) {
  const index =
    args.indexOf("--isWindows") !== -1
      ? args.indexOf("--isWindows")
      : args.indexOf("-w");
  const value = args[index + 1];
  isWindows = value === "true";
}

const baseConfig: BuildOptions = {
  bundle: true,
  minify: true,
  format: "cjs",
  legalComments: "none",
};

build({
  ...baseConfig,
  outfile: "./build/preload.cjs",
  platform: "browser",
  external: ["electron"],
  entryPoints: ["./src/preload.ts"],
}).catch((err) => {
  console.error("Preload build failed", err);
  process.exit(1);
});

build({
  ...baseConfig,
  outfile: "./build/index.cjs",
  platform: "node",
  external: ["dnssd", "electron"],
  entryPoints: ["./src/main/index.ts"],
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
        replacer: () => packageJson.version,
      },
      {
        filter: /\.ts|\.js$/,
        replace: /{{WEB_VERSION}}/g,
        replacer: () => expoVersion || "0.0.0",
      },
    ]),
  ],
}).catch((err) => {
  console.error("Build failed:", err);
  process.exit(1);
});
