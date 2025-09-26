/* eslint-disable no-console */
import fs from "fs";
import path from "path";
import chalk from "chalk";
import dotenv from "dotenv";
import { execSync } from "child_process";

dotenv.config({ path: "../.env" });

if (!process.env.API_URL)
  throw new Error("API_URL is not defined in environment variables");

let __dirname = path.resolve();
if (__dirname.endsWith("app")) __dirname = path.join(__dirname, "..");

const isWindows = process.platform === "win32";

const getPath = (relativePath: string) => {
  const pathLocal = path.resolve(__dirname, relativePath);
  if (!fs.existsSync(pathLocal)) {
    console.log(
      chalk.yellow(
        `Creating directory: ${pathLocal} with relative path: ${relativePath}`,
      ),
    );
    fs.mkdirSync(pathLocal, { recursive: true });
  }

  return pathLocal;
};

const editMainApplication = async () => {
  console.log(chalk.blue("Editing MainApplication.kt..."));

  const mainApplicationPath = getPath(
    "app/android/app/src/main/java/com/utilities/depremu/MainApplication.kt",
  );
  const mainApplicationContent = fs.readFileSync(mainApplicationPath, "utf8");
  const packageMA = "package com.utilities.depremu\n";

  const newContent = mainApplicationContent.replace(
    packageMA,
    [
      packageMA,
      "import com.utilities.depremu.ClipboardPackage",
      "import com.utilities.depremu.KeyboardPackage",
      "",
    ].join("\n"),
  );

  const getPackagesRegex = /getPackages\(\)[^}]+}/g;
  const getPackagesMatch = newContent.match(getPackagesRegex)?.[0];

  if (!getPackagesMatch) {
    console.error(
      chalk.red("Could not find getPackages function"),
      "add manual package in MainApplication.kt fun getPackages()",
    );
    return;
  }

  const curlyBraces = getPackagesMatch.match(/{[^}]*}/g)?.[0];
  if (!curlyBraces) {
    console.error(
      chalk.red("Could not find curly braces in getPackages function"),
      "add manual package in MainApplication.kt fun getPackages()",
    );
    return;
  }

  const packages = ["ClipboardPackage()", "KeyboardPackage()"];

  fs.writeFileSync(
    mainApplicationPath,
    newContent.replace(curlyBraces, (match) => {
      const packagesNotAdded = packages.filter((pkg) => !match.includes(pkg));
      match = packagesNotAdded.map((p) => `add(${p})`).join("\n");

      return `{\n${match}\n}`;
    }),
  );
  console.log(chalk.green("MainApplication.kt edited successfully."));
};

const createModules = async () => {
  const modulesPath = getPath("app/native/modules/modules.json");

  console.log(chalk.blue("Creating native modules..."));
  const modules = JSON.parse(fs.readFileSync(modulesPath, "utf8")) as {
    name: string;
    service?: string;
    content: string;
    initPath: string;
    permissions?: string[];
    finalPath: string;
  }[];

  modules.forEach((module) => {
    const modulePath = getPath(module.initPath);
    if (module.name === "ForegroundClipboardService.kt") {
      const content = fs.readFileSync(
        path.resolve(modulePath, module.name),
        "utf8",
      );
      if (!process.env.SUPABASE_URL || !process.env.SUPABASE_KEY) {
        console.error(
          chalk.red(
            "SUPABASE_URL or SUPABASE_KEY is not defined in environment variables",
          ),
        );
        return;
      }
      const newContent = content.replace(
        "{{serverURL}}",
        process.env.API_URL || "",
      );
      fs.writeFileSync(
        path.resolve(getPath(module.finalPath), module.name),
        newContent,
      );

      return;
    }

    fs.copyFileSync(
      path.resolve(modulePath, module.name),
      path.resolve(getPath(module.finalPath), module.name),
    );
  });
  console.log(chalk.green("Native modules created successfully."));

  await modifyAndroidManifest(modules.map((m) => m.service || ""));
  await addPermissionsToManifest(modules.flatMap((m) => m.permissions || []));
  await editMainApplication();
  console.log(chalk.green("Prebuild process completed."));
};

const addPermissionsToManifest = async (newPermissions: string[]) => {
  return new Promise<void>((resolve) => {
    const androidManifestPath = path.resolve(
      __dirname,
      "app",
      "android",
      "app",
      "src",
      "main",
      "AndroidManifest.xml",
    );
    const backupPath = androidManifestPath + ".bak";

    fs.copyFileSync(androidManifestPath, backupPath);

    try {
      console.log(chalk.blue("Adding permissions to AndroidManifest.xml..."));
      const manifestContent = fs.readFileSync(androidManifestPath, "utf8");
      const permissionsAlreadyPresent = manifestContent
        .match(/<uses-permission[^>]+>/g)
        ?.map((match) => match.trim());
      const permissions = permissionsAlreadyPresent?.map(
        (perm) => perm.match(/android:name="([^"]+)"/)?.[1],
      );

      newPermissions = newPermissions.filter(
        (perm) => !permissions?.includes(perm),
      );

      const permissionTags = newPermissions.map(
        (perm) => `    <uses-permission android:name="${perm}"/>`,
      );

      if (permissionTags.length === 0) {
        resolve();
        return;
      }

      fs.writeFileSync(
        androidManifestPath,
        manifestContent.replace(
          permissionsAlreadyPresent?.[0] || "</manifest>",
          [permissionsAlreadyPresent?.[0] || "", ...permissionTags].join("\n"),
        ),
      );
    } catch (error) {
      console.error(chalk.red("Error modifying AndroidManifest.xml:"), error);
      fs.copyFileSync(backupPath, androidManifestPath);
    }

    console.log(chalk.green("Permissions added to AndroidManifest.xml."));
    resolve();
  });
};

const modifyAndroidManifest = async (newServices: string | string[]) => {
  return new Promise<void>((resolve) => {
    const androidManifestPath = path.resolve(
      __dirname,
      "app",
      "android",
      "app",
      "src",
      "main",
      "AndroidManifest.xml",
    );
    const backupPath = androidManifestPath + ".bak";

    fs.copyFileSync(androidManifestPath, backupPath);

    try {
      console.log(chalk.blue("Modifying AndroidManifest.xml..."));
      const manifestContent = fs.readFileSync(androidManifestPath, "utf8");
      const application = manifestContent.match(
        /<application.*<\/application>/s,
      )?.[0];

      if (!application)
        throw new Error("No <application> tag found in AndroidManifest.xml");

      const services = Array.isArray(newServices) ? newServices : [newServices];

      const newApplication = application?.replace(
        "</application>",
        [...services, "</application>"].join("\n"),
      );

      fs.writeFileSync(
        androidManifestPath,
        manifestContent.replace(application, newApplication),
      );
    } catch (error) {
      console.error(chalk.red("Error modifying AndroidManifest.xml:"), error);
      fs.copyFileSync(backupPath, androidManifestPath);
    }

    console.log(chalk.green("AndroidManifest.xml modified."));
    resolve();
  });
};

const runPrebuild = () => {
  const projectRoot = path.resolve(__dirname, "app");
  const commands = [
    `cd ${projectRoot}`,
    "npm i",
    "npx expo prebuild --platform android",
  ];
  if (!projectRoot.endsWith("app"))
    throw new Error("Project root does not end with 'app'");
  if (!fs.existsSync(path.join(projectRoot, "google-services.json")))
    throw new Error("Missing google-services.json file");

  try {
    console.log(chalk.blue("Running prebuild script..."));
    const output = execSync(
      commands.join(isWindows ? " && " : "; "),
    )?.toString();

    if (!output?.includes("Finished prebuild"))
      throw new Error(["Prebuild failed", output].join("\n"));

    console.log(chalk.green("Prebuild completed successfully."));
    createModules();
  } catch (error) {
    console.error(chalk.red("Error running prebuild script:"), error);
  }
};

runPrebuild();
