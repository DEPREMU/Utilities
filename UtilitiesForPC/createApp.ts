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
import chalk from "chalk";
import { execSync } from "child_process";

let __dirname = path.resolve();
if (!__dirname.endsWith("UtilitiesForPC")) {
  __dirname = path.resolve(__dirname, "UtilitiesForPC");
}
if (!fs.existsSync(__dirname))
  throw new Error("__dirname does not exist: " + __dirname);

const buildApp = () => {
  console.log(chalk.blue("Building Electron app..."));
  execSync("npm run build", { cwd: __dirname });
  console.log(chalk.green("Electron app build command executed."));

  console.log(chalk.blue("Elevating permissions and packaging the app..."));
  execSync(
    `powershell -Command "Start-Process powershell -Verb RunAs -ArgumentList '-NoExit', '-Command', 'cd \"${__dirname}\"; npx electron-builder; exit'"`,
    { cwd: __dirname }
  );
  console.log(
    chalk.black.bgGreen.bold(
      "App was packaged successfully. Now you can wait for the PowerShell window to close to install the app in the folder 'dist-electron'."
    )
  );
};

const exportWebApp = () => {
  const appPath = path.resolve(__dirname, "..", "app");
  if (!fs.existsSync(appPath))
    throw new Error("App path does not exist: " + appPath);

  console.log(chalk.blue("Installing dependencies..."));
  execSync("npm install", { cwd: appPath });
  console.log(chalk.green("Dependencies installed."));

  console.log(chalk.blue("Building web app..."));
  const data = execSync("npm run build:web", { cwd: appPath });
  if (!data.toString().includes("Exported: dist"))
    throw new Error("Failed to build web app" + data.toString());
  console.log(chalk.green("Web app built successfully."));

  console.log(chalk.blue("Cleaning up old build directories..."));
  ["dist", "dist-electron", "release", "build"].forEach((dir) => {
    try {
      const fullPath = path.resolve(__dirname, dir);
      if (fs.existsSync(fullPath)) fs.rmSync(fullPath, { recursive: true });
    } catch {}
  });
  console.log(chalk.green("Old build directories cleaned."));

  console.log(chalk.blue("Preparing files for Electron app..."));
  const distPath = path.resolve(appPath, "dist");
  const distPathToCopy = path.resolve(__dirname, "dist");
  fs.cpSync(distPath, distPathToCopy, { recursive: true });
  fs.rmSync(distPath, { recursive: true });

  console.log(chalk.blue("Copying assets..."));
  ["ico", "png"].forEach((ext) => {
    fs.copyFileSync(
      path.resolve(__dirname, "assets", `tray-icon.${ext}`),
      path.resolve(__dirname, "dist", "assets", `tray-icon.${ext}`)
    );
  });
  console.log(chalk.green("Assets copied."));

  console.log(chalk.blue("Inlining JS and fonts into HTML..."));
  const jsPath = path.resolve(
    __dirname,
    "dist",
    "_expo",
    "static",
    "js",
    "web"
  );
  if (!fs.existsSync(jsPath))
    throw new Error("Failed to find JS bundle: " + jsPath);

  const files = fs.readdirSync(jsPath);
  const mainFile = files.find((file) => file.endsWith(".js"));

  if (!mainFile) throw new Error("Failed to find main JS bundle in: " + jsPath);

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
  console.log(chalk.green("JS and fonts inlined."));

  buildApp();
};

exportWebApp();
