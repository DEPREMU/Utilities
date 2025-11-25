import fs from "fs";
import path from "path";
import dotenv from "dotenv";
import readline from "readline";
import APP_CONFIG from "../app/app.config.js";
import type * as Types from "@types";

export const UTILITIES_PATH = path.resolve();
if (!UTILITIES_PATH.endsWith("Utilities"))
  throw new Error("This script must be run from the Utilities directory.");

export const APP_PATH = path.resolve(UTILITIES_PATH, "app");
export const TYPES_PATH = path.resolve(UTILITIES_PATH, "types");
export const SERVER_PATH = path.resolve(UTILITIES_PATH, "server");
export const SCRIPTS_PATH = path.resolve(UTILITIES_PATH, "scripts");
export const ANDROID_PATH = path.resolve(APP_PATH, "android");
export const UTILITIES_FOR_PC_PATH = path.resolve(
  UTILITIES_PATH,
  "UtilitiesForPC"
);
export const gitignore = fs.readFileSync(
  path.resolve(UTILITIES_PATH, ".gitignore"),
  "utf-8"
);

export const versionExpo = APP_CONFIG.expo.version;
if (!versionExpo) throw new Error("Version not found in app.config.js");

export const versionElectron = JSON.parse(
  fs.readFileSync(
    path.join(process.cwd(), "UtilitiesForPC", "package.json"),
    "utf-8"
  )
)?.version as string;
if (!versionElectron)
  throw new Error("Version not found in UtilitiesForPC/package.json");

dotenv.config({ path: path.resolve(UTILITIES_PATH, ".env") });
export const env = {
  ...process.env,
  PLATFORM: "android",
  EAS_BUILD: false,
  BUILD_PROFILE: "production",
} as unknown as Types.Env & NodeJS.ProcessEnv;

export const URL_UPDATES = env.API_URL?.replace("api", "updates") as string;
if (!URL_UPDATES)
  throw new Error("API_URL is not defined in environment variables.");

export const getRouteUpdates = (route: Types.UpdatesRoutes): string => {
  return `${URL_UPDATES}${route}`;
};

export const ask = (question: string): Promise<string> => {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });

  return new Promise((resolve) => {
    const id = setTimeout(() => resolve(""), 5000);
    rl.question(question, (answer) => {
      rl.close();
      clearTimeout(id);
      resolve(answer);
    });
  });
};

export const deleteAndroidFromGitIgnore = (restore = false) => {
  if (restore) {
    fs.writeFileSync(path.resolve(UTILITIES_PATH, ".gitignore"), gitignore);
    return;
  }

  const lines = gitignore
    .split("\n")
    .filter((line) => !line.trim().includes("android/"));

  fs.writeFileSync(
    path.resolve(UTILITIES_PATH, ".gitignore"),
    lines.join("\n")
  );
};

export const getSumVersion = (version: string): number => {
  return version
    .split(".")
    .reduce(
      (sum, part, index) => sum + parseInt(part) * Math.pow(1000, 2 - index),
      0
    );
};

export const isNewVersion = (current: string, latest: string): boolean => {
  return getSumVersion(latest) > getSumVersion(current);
};

export const handleExitFromScript = (fun: () => void) => {
  process.on("exit", fun);
  process.on("SIGINT", fun);
  process.on("SIGTERM", fun);
  process.on("uncaughtException", fun);
  process.on("unhandledRejection", fun);
};

export * from "./arguments.ts";
export { APP_CONFIG };
