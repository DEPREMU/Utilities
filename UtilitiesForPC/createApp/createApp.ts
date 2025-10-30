/**
 * This script builds the Electron app for Windows.
 * It first builds the web version of the app, then packages it using Electron Builder.
 * Make sure to run this script in an environment where you have the necessary permissions.
 * Requires Node.js and npm to be installed.
 * Run this script from the root directory Utilities/ where the UtilitiesForPC folder is located, or from the UtilitiesForPC directory.
 * Usage: `node createApp.js` or `node UtilitiesForPC/createApp.js`
 * * Note: This script uses PowerShell to elevate permissions for the build process on Windows.
 *
 */

import fs from "fs";
import path from "path";
import { t } from "./translations.ts";
import packageJson from "../package.json" with { type: "json" };
import { execSync } from "child_process";
import * as readline from "readline";

const askQuestion = async (question: string): Promise<string> => {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });
  const answer = await new Promise((resolve: (value: string) => void) => {
    rl.question(question, resolve);
  });
  rl.close();
  return answer;
};

let __dirname = path.resolve("../");
if (!__dirname.endsWith("UtilitiesForPC")) {
  __dirname = path.resolve(__dirname, "UtilitiesForPC");
}
if (!fs.existsSync(__dirname))
  throw new Error("__dirname does not exist: " + __dirname);

const isWindows = process.platform === "win32";

const dataBuild = {
      distElectron: packageJson.build.directories.output,
      appName: packageJson.name,
};
    

const buildApp = async () => {
  console.log(t("buildingApp"));
  execSync("npm run build", { cwd: __dirname });
  console.log(t("appBuildCommandExecuted"));

  console.log(t("elevatingPermissions"));
  if (isWindows)
    execSync(
      `powershell -Command "Start-Process powershell -Verb RunAs -ArgumentList '-NoExit', '-Command', 'cd \"${__dirname}\"; npx electron-builder --wi; exit'"`,
      { cwd: __dirname }
    );
  else {
    

    execSync("npx electron-builder", { cwd: __dirname });
    console.log(t("appPackagedSuccessfully"));
    const dir = execSync(`cd ${dataBuild.distElectron}; ls`, {
      cwd: __dirname,
    });
    const packageName = dir
      .toString()
      .split("\n")
      .find((file) => file.endsWith(".snap"));
    if (!packageName) throw new Error(t("FailedToFindSnapPackage"));
    execSync(
      `sudo snap install ${dataBuild.distElectron}/${packageName} --dangerous; sudo apt install gnome-shell-extension-appindicator`,
      {
        cwd: __dirname,
        stdio: "inherit",
      }
    );

    const answer = await askQuestion(t("pleaseRestartComputer"));
    if (answer.toLowerCase() === "y") {
      console.log(t("restartNow"));
      execSync("sudo reboot", { stdio: "inherit" });
    } else {
      console.log(t("restartingComputer"));
    }

    const answer2 = await askQuestion(t("openAppNow"));

    if (answer2.toLowerCase() === "y") {
      execSync(
        `snap run ${dataBuild.appName} --no-sandbox --disable-gpu --ozone-platform=x11`,
        {
          cwd: __dirname,
        }
      );
    }
  }
  console.log(
    `App was packaged successfully. ${
      isWindows ? "" : t("appPackagedSuccessMessage")
    }`
  );
};

const exportWebApp = () => {
  const appPath = path.resolve(__dirname, "..", "app");
  if (!fs.existsSync(appPath))
    throw new Error(t("appPathDoesNotExist") + appPath);

  console.log(t("installingDependencies"));
  execSync("npm install", { cwd: appPath });
  console.log(t("dependenciesInstalled"));

  console.log(t("buildingWebApp"));
  const data = execSync("npm run build:web", { cwd: appPath });
  if (!data.toString().includes("Exported: dist"))
    throw new Error(t("failedToBuildWebApp") + data.toString());
  console.log(t("webAppBuiltSuccessfully"));

  console.log(t("cleaningUpOldBuildDirectories"));
  ["dist", dataBuild.distElectron, "release", "build"].forEach((dir) => {
    try {
      const fullPath = path.resolve(__dirname, dir);
      if (fs.existsSync(fullPath)) fs.rmSync(fullPath, { recursive: true });
    } catch {}
  });
  console.log(t("oldBuildDirectoriesCleaned"));

  console.log(t("preparingFilesForElectronApp"));
  const distPath = path.resolve(appPath, "dist");
  const distPathToCopy = path.resolve(__dirname, "dist");
  fs.cpSync(distPath, distPathToCopy, { recursive: true });
  fs.rmSync(distPath, { recursive: true });

  console.log(t("copyingAssets"));
  ["ico", "png"].forEach((ext) => {
    fs.copyFileSync(
      path.resolve(__dirname, "assets", `tray-icon.${ext}`),
      path.resolve(__dirname, "dist", "assets", `tray-icon.${ext}`)
    );
  });
  console.log(t("assetsCopied"));

  console.log(t("inliningJSAndFontsIntoHTML"));
  const jsPath = path.resolve(
    __dirname,
    "dist",
    "_expo",
    "static",
    "js",
    "web"
  );
  if (!fs.existsSync(jsPath))
    throw new Error(t("failedToFindJSBundle") + jsPath);

  const files = fs.readdirSync(jsPath);
  const mainFile = files.find((file) => file.endsWith(".js"));

  if (!mainFile) throw new Error(t("failedToFindMainJSBundle") + jsPath);

  const mainFilePath = path.resolve(jsPath, mainFile);
  const mainFileContent = fs.readFileSync(mainFilePath, "utf-8");

  let html = fs.readFileSync(
    path.resolve(__dirname, "dist", "index.html"),
    "utf-8"
  );
  const fontsPath = path.resolve(__dirname, "dist", "assets", "fonts");

  if (!fs.existsSync(fontsPath))
    fs.mkdirSync(fontsPath, {
      recursive: true,
    });

  const MaterialCommunityIcons = path.resolve(
    appPath,
    "node_modules",
    "react-native-vector-icons",
    "Fonts",
    "MaterialCommunityIcons.ttf"
  );
  if (fs.existsSync(MaterialCommunityIcons))
    fs.copyFileSync(
      MaterialCommunityIcons,
      path.resolve(fontsPath, "MaterialCommunityIcons.ttf")
    );

  html = html.replace(/<script[^*]+<\/script>/g, () => {
    return `<script defer>\n${mainFileContent}\n</script>`;
  });
  html = html.replace(/@font-face[^`]+/g, (match) => {
    return match.replace(
      /url\([^\)]+\)/g,
      'url("./assets/fonts/MaterialCommunityIcons.ttf") format("truetype")'
    );
  });
  fs.writeFileSync(path.resolve(__dirname, "dist", "index.html"), html);
  console.log(t("jsAndFontsInlined"));

  buildApp();
};

exportWebApp();
