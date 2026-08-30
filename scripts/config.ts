import fs from "fs";
import path from "path";
import dotenv from "dotenv";
import { args } from "./arguments.ts";
import type * as Types from "@types";
import APP_CONFIG_FUNC from "@appSrc/app.config.ts";
import { getAllPathsSync } from "@commonSrc/serverOrElectron/fs.ts";
import type PACKAGE_JSON_APP from "@appSrc/package.json";
import type PACKAGE_JSON_UTILITIES_FOR_PC from "@utilitiesSrc/package.json";

const paths = getAllPathsSync();
export const UTILITIES_PATH = paths.root;
export const APP_PATH = paths.app;
export const TYPES_PATH = paths.types;
export const COMMON_PATH = paths.common;
export const SERVER_PATH = paths.server;
export const FRONTEND_PATH = paths.frontend;
export const UTILITIES_FOR_PC_PATH = paths.utilitiesForPC;

export const SCRIPTS_PATH = path.join(UTILITIES_PATH, "scripts");
export const ANDROID_PATH = path.join(APP_PATH, "android");

export const APP_CONFIG = APP_CONFIG_FUNC(
  {
    config: {},
    packageJsonPath: path.resolve(APP_PATH, "package.json"),
    projectRoot: APP_PATH,
    staticConfigPath: path.resolve(APP_PATH, "app.config.ts"),
  },
  args.ARGS.BUILD_PROFILE ?? process.env.BUILD_PROFILE ?? "production",
);

export const GRADLE_OPTS = "-Xmx4g -XX:MaxMetaspaceSize=1536m";

export const gitignore = fs.readFileSync(
  path.resolve(UTILITIES_PATH, ".gitignore"),
  "utf-8",
);

export const PACKAGE_JSON_UtilitiesForPC = JSON.parse(
  fs.readFileSync(path.resolve(UTILITIES_FOR_PC_PATH, "package.json"), "utf-8"),
) as typeof PACKAGE_JSON_UTILITIES_FOR_PC;

export const PACKAGE_JSON_App = JSON.parse(
  fs.readFileSync(path.resolve(APP_PATH, "package.json"), "utf-8"),
) as typeof PACKAGE_JSON_APP;

export const versionExpo = APP_CONFIG.version as string;
if (!versionExpo) throw new Error("Version not found in app.config.js");

export const versionElectron = PACKAGE_JSON_UtilitiesForPC.version as string;
if (!versionElectron)
  throw new Error("Version not found in UtilitiesForPC/package.json");

dotenv.config({ path: path.resolve(UTILITIES_PATH, ".env") });
export const env = {
  ...process.env,
  PLATFORM: args.ARGS.platform ?? "android",
  EAS_BUILD: "0",
  BUILD_PROFILE: args.ARGS.BUILD_PROFILE ?? "production",
} as Partial<Types.Env> & NodeJS.ProcessEnv;

export * from "./arguments.ts";
