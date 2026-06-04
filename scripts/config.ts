import fs from "fs";
import path from "path";
import dotenv from "dotenv";
import readline from "readline";
import { ARGS } from "./arguments.ts";
import type * as Types from "@types";
import APP_CONFIG_FUNC from "../app/app.config.ts";
import type PACKAGE_JSON_APP from "../UtilitiesForPC/package.json";
import type PACKAGE_JSON_UTILITIES_FOR_PC from "../UtilitiesForPC/package.json";

export const UTILITIES_PATH = path.resolve();
if (!UTILITIES_PATH.endsWith("Utilities"))
  throw new Error("This script must be run from the Utilities directory.");

export const APP_PATH = path.resolve(UTILITIES_PATH, "app");
export const TYPES_PATH = path.resolve(UTILITIES_PATH, "types");
export const COMMON_PATH = path.resolve(UTILITIES_PATH, "common");
export const SERVER_PATH = path.resolve(UTILITIES_PATH, "server");
export const SCRIPTS_PATH = path.resolve(UTILITIES_PATH, "scripts");
export const ANDROID_PATH = path.resolve(APP_PATH, "android");
export const UTILITIES_FOR_PC_PATH = path.resolve(
  UTILITIES_PATH,
  "UtilitiesForPC",
);

export const PLATFORM = {
  isLinux: process.platform === "linux",
  isWindows: process.platform === "win32",
};

export const APP_CONFIG = APP_CONFIG_FUNC(
  {
    config: {},
    packageJsonPath: path.resolve(APP_PATH, "package.json"),
    projectRoot: APP_PATH,
    staticConfigPath: path.resolve(APP_PATH, "app.config.ts"),
  },
  ARGS.BUILD_PROFILE ?? process.env.BUILD_PROFILE ?? "production",
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
  PLATFORM: ARGS.platform ?? "android",
  EAS_BUILD: false,
  BUILD_PROFILE: ARGS.BUILD_PROFILE ?? "production",
} as unknown as Types.Env & NodeJS.ProcessEnv;

export const URL_UPDATES = env.API_URL?.replace("api", "updates") as string;
if (!URL_UPDATES)
  throw new Error("API_URL is not defined in environment variables.");

export const getRouteUpdates = (route: Types.UpdatesRoutes): string => {
  return `${URL_UPDATES}${route}`;
};

export const ask = async (
  question: string,
  timeout = 5000,
): Promise<string> => {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });

  return await new Promise<string>((resolve) => {
    let id: number;
    if (timeout > 0)
      id = setTimeout(() => {
        rl?.close?.();
        resolve("");
      }, timeout);
    rl.question(question, (answer) => {
      rl.close();
      if (timeout > 0) clearTimeout(id);
      resolve(answer);
    });
  });
};

export const deleteAndroidFromGitIgnore = (restore = false) => {
  if (restore) {
    let prev = gitignore;
    if (!prev.includes("android/")) prev += "\nandroid/";

    fs.writeFileSync(path.resolve(UTILITIES_PATH, ".gitignore"), prev);
    return;
  }

  const lines = gitignore
    .split("\n")
    .filter((line) => !line.trim().includes("android/"));

  fs.writeFileSync(
    path.resolve(UTILITIES_PATH, ".gitignore"),
    lines.join("\n"),
  );
};

export const getSumVersion = (version: string): number => {
  return version
    .split(".")
    .reduce(
      (sum, part, index) => sum + parseInt(part) * Math.pow(1000, 2 - index),
      0,
    );
};

export const isNewVersion = (
  current: string,
  serverVersion: string,
): boolean => {
  if (serverVersion.toLowerCase() === "unknown") return true;

  return getSumVersion(serverVersion) < getSumVersion(current);
};

export const handleExitFromScript = (fun: (err?: Error) => void) => {
  const wrappedFun = (err?: Error) => {
    if (err && !(err instanceof Error)) err = undefined;

    try {
      fun(err);
    } catch (error) {
      // eslint-disable-next-line no-console
      console.error("Error in exit handler", error);
    } finally {
      process.exit(err ? 1 : 0);
    }
  };

  process.on("exit", wrappedFun);
  process.on("SIGINT", wrappedFun);
  process.on("SIGTERM", wrappedFun);
  process.on("uncaughtException", wrappedFun);
  process.on("unhandledRejection", wrappedFun);
};

export * from "./arguments.ts";
