import fs from "fs";
import path from "path";
import { APP_PATH } from "../config.ts";

export const pathAppConfig = path.join(APP_PATH, "app.config.ts");

export const contentAppConfig = fs.readFileSync(
  pathAppConfig,
  "utf8"
) as string;
let editedContentAppConfig = contentAppConfig;

export const replaceAppConfig = (
  versionNew: string | ((prev: string) => string),
  nameNew: string | ((prev: string) => string),
  packageNew: string | ((prev: string) => string)
) => {
  // Replace version
  const versionMatch = editedContentAppConfig.match(/const version[^;]+/g);
  if (!versionMatch) throw new Error("Version not found in app config");

  const version = versionMatch[0].split('"')[1];
  if (!version) throw new Error("Version is empty in app config");

  editedContentAppConfig = contentAppConfig.replace(
    version,
    typeof versionNew === "function" ? versionNew(version) : versionNew
  );

  // Replace package name
  const packageMatch = editedContentAppConfig.match(/package:[^,]+/g);
  if (!packageMatch) throw new Error("Package name not found in app config");

  const packageName = packageMatch[0].split(":")[1].trim().replace(/['"]/g, "");
  if (!packageName) throw new Error("Package name is empty in app config");

  editedContentAppConfig = editedContentAppConfig.replace(
    packageName,
    typeof packageNew === "function" ? packageNew(packageName) : packageNew
  );

  // Replace app name
  const nameMatch = editedContentAppConfig.match(/name:[^,]+/g);
  if (!nameMatch) throw new Error("App name not found in app config");

  const appName = nameMatch[0].split(":")[1].trim().replace(/['"]/g, "");
  if (!appName) throw new Error("App name is empty in app config");

  const newName = typeof nameNew === "function" ? nameNew(appName) : nameNew;

  editedContentAppConfig = editedContentAppConfig.replace(
    nameMatch[0],
    `name: "${newName}"`
  );

  try {
    fs.writeFileSync(pathAppConfig, editedContentAppConfig);
  } catch (error) {
    throw new Error("Failed to write updated app config");
  }
};
