import {
  args,
  APP_PATH,
  UTILITIES_PATH,
  UTILITIES_FOR_PC_PATH,
  PACKAGE_JSON_UtilitiesForPC,
} from "../config.ts";
import fs from "fs";
import path from "path";
import { t } from "./translations.ts";
import { Logger } from "@commonSrc/serverOrElectron/logger.ts";
import { execSync } from "child_process";

const dataBuild = {
  distElectron: path.join(
    UTILITIES_FOR_PC_PATH,
    PACKAGE_JSON_UtilitiesForPC.build.directories.output,
  ),
} as const;

const removeDirSafe = (dirPath: string) => {
  try {
    if (fs.existsSync(dirPath))
      fs.rmSync(dirPath, { recursive: true, force: true });
  } catch {
    // Ignore
  }
};

const exportWebApp = () => {
  if (!fs.existsSync(APP_PATH))
    throw new Error(t("appPathDoesNotExist") + APP_PATH);


  Logger.log(t("installingDependencies"));
  execSync("yarn install", { cwd: UTILITIES_PATH });
  Logger.log(t("dependenciesInstalled"));

  Logger.log(t("buildingWebApp"));
  const data = execSync(`yarn run build-web ${args.getArgs()}`, {
    cwd: UTILITIES_PATH,
  });
  if (!data.toString().includes("Exported: dist"))
    throw new Error(t("failedToBuildWebApp") + data.toString());
  Logger.log(t("webAppBuiltSuccessfully"));

  Logger.log(t("cleaningUpOldBuildDirectories"));
  [
    path.resolve(UTILITIES_FOR_PC_PATH, "dist"),
    dataBuild.distElectron,
    path.resolve(UTILITIES_FOR_PC_PATH, "release"),
    path.resolve(UTILITIES_FOR_PC_PATH, "build"),
  ].forEach((dir) => {
    removeDirSafe(dir);
  });
  Logger.log(t("oldBuildDirectoriesCleaned"));

  Logger.log(t("preparingFilesForElectronApp"));
  const distPath = path.resolve(APP_PATH, "dist");
  const distPathToCopy = path.resolve(UTILITIES_FOR_PC_PATH, "dist");
  fs.cpSync(distPath, distPathToCopy, { recursive: true });
  fs.rmSync(distPath, { recursive: true });
};

const run = async () => {
  try {
    exportWebApp();
  } catch (error) {
    Logger.error(t("buildFailed"), error);
    process.exit(1);
  }
};

run();
