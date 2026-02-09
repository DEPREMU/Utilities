import {
  getArgs,
  APP_PATH,
  UTILITIES_PATH,
  UTILITIES_FOR_PC_PATH,
  PACKAGE_JSON_UtilitiesForPC,
} from "../config.ts";
import fs from "fs";
import path from "path";
import { t } from "./translations.ts";
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
  } catch {}
};

const exportWebApp = () => {
  if (!fs.existsSync(APP_PATH))
    throw new Error(t("appPathDoesNotExist") + APP_PATH);

  const args = getArgs();

  console.log(t("installingDependencies"));
  execSync("yarn install", { cwd: UTILITIES_PATH });
  console.log(t("dependenciesInstalled"));

  console.log(t("buildingWebApp"));
  const data = execSync(`yarn run build-web ${args}`, {
    cwd: UTILITIES_PATH,
  });
  if (!data.toString().includes("Exported: dist"))
    throw new Error(t("failedToBuildWebApp") + data.toString());
  console.log(t("webAppBuiltSuccessfully"));

  console.log(t("cleaningUpOldBuildDirectories"));
  [
    path.resolve(UTILITIES_FOR_PC_PATH, "dist"),
    dataBuild.distElectron,
    path.resolve(UTILITIES_FOR_PC_PATH, "release"),
    path.resolve(UTILITIES_FOR_PC_PATH, "build"),
  ].forEach((dir) => {
    removeDirSafe(dir);
  });
  console.log(t("oldBuildDirectoriesCleaned"));

  console.log(t("preparingFilesForElectronApp"));
  const distPath = path.resolve(APP_PATH, "dist");
  const distPathToCopy = path.resolve(UTILITIES_FOR_PC_PATH, "dist");
  fs.cpSync(distPath, distPathToCopy, { recursive: true });
  fs.rmSync(distPath, { recursive: true });

  const assetsPath = path.resolve(UTILITIES_FOR_PC_PATH, "dist", "assets");
  fs.mkdirSync(assetsPath, { recursive: true });

  console.log(t("copyingAssets"));
  ["ico", "png"].forEach((ext) => {
    fs.copyFileSync(
      path.resolve(UTILITIES_FOR_PC_PATH, "assets", `tray-icon.${ext}`),
      path.resolve(assetsPath, `tray-icon.${ext}`),
    );
  });
  console.log(t("assetsCopied"));
};

const run = async () => {
  try {
    exportWebApp();
  } catch (error) {
    console.error(t("buildFailed"), error);
    process.exit(1);
  }
};

run();
