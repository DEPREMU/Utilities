/* eslint-disable no-console */
import fs from "fs";
import path from "path";
import chalk from "chalk";
import { execSync } from "child_process";
import { APP_CONFIG, APP_PATH, env } from "../config.ts";

const packageName = APP_CONFIG.android?.package;
if (!packageName) throw new Error("Package name not found in app config");

const getPath = (relativePath: string) => {
  const pathLocal = path.resolve(APP_PATH, relativePath);
  if (!fs.existsSync(pathLocal)) {
    console.log(
      chalk.yellow(
        `Creating directory: ${pathLocal} with relative path: ${relativePath}`
      )
    );
    fs.mkdirSync(pathLocal, { recursive: true });
  }

  return pathLocal;
};

const editMainApplication = async () => {
  console.log(chalk.blue("Editing MainApplication.kt..."));

  const mainApplicationPath = getPath(
    `android/app/src/main/java/${packageName.replace(
      /\./g,
      "/"
    )}/MainApplication.kt`
  );
  const mainApplicationContent = fs.readFileSync(mainApplicationPath, "utf8");
  const packageMA = `package ${packageName}\n`;

  const newContent = mainApplicationContent.replace(
    packageMA,
    [
      packageMA,
      `import ${packageName}.KeyboardPackage`,
      `import ${packageName}.NotificationPackage`,
      `import ${packageName}.NativeFunctionsPackage`,
      `import ${packageName}.BackgroundServicePackage`,
      "",
    ].join("\n")
  );

  const getPackagesRegex = /getPackages\(\)[^}]+}/g;
  const getPackagesMatch = newContent.match(getPackagesRegex)?.[0];

  if (!getPackagesMatch) {
    console.error(
      chalk.red("Could not find getPackages function"),
      "add manual package in MainApplication.kt fun getPackages()"
    );
    return;
  }

  const curlyBraces = getPackagesMatch.match(/{[^}]*}/g)?.[0];
  if (!curlyBraces) {
    console.error(
      chalk.red("Could not find curly braces in getPackages function"),
      "add manual package in MainApplication.kt fun getPackages()"
    );
    return;
  }

  const packages = [
    "KeyboardPackage()",
    "NotificationPackage()",
    "NativeFunctionsPackage()",
    "BackgroundServicePackage()",
  ];

  fs.writeFileSync(
    mainApplicationPath,
    newContent.replace(curlyBraces, (match) => {
      const packagesNotAdded = packages.filter((pkg) => !match.includes(pkg));
      match = packagesNotAdded.map((p) => `add(${p})`).join("\n");

      return `{\n${match}\n}`;
    })
  );
  console.log(chalk.green("MainApplication.kt edited successfully."));
};

const createModules = async () => {
  const modulesPath = getPath("native/modules.json");

  console.log(chalk.blue("Creating native modules..."));
  const modules = JSON.parse(fs.readFileSync(modulesPath, "utf8")) as {
    name: string;
    content: string;
    service?: string;
    initPath: string;
    finalPath: string;
    permissions?: string[];
  }[];

  modules.forEach((module) => {
    const modulePath = getPath(module.initPath);

    const content = fs
      .readFileSync(path.resolve(modulePath, module.name), "utf8")
      .replace("{{packageName}}", packageName);

    const finalPath =
      module.finalPath +
      (module.name.endsWith(".kt") ? packageName.replace(/\./g, "/") : "");

    fs.writeFileSync(path.resolve(getPath(finalPath), module.name), content, {
      encoding: "utf8",
    });
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
      APP_PATH,
      "android",
      "app",
      "src",
      "main",
      "AndroidManifest.xml"
    );

    try {
      console.log(chalk.blue("Adding permissions to AndroidManifest.xml..."));
      const manifestContent = fs.readFileSync(androidManifestPath, "utf8");
      const permissionsAlreadyPresent = manifestContent
        .match(/<uses-permission[^>]+>/g)
        ?.map((match) => match.trim());
      const permissions = permissionsAlreadyPresent?.map(
        (perm) => perm.match(/android:name="([^"]+)"/)?.[1]
      );

      newPermissions = newPermissions.filter(
        (perm) => !permissions?.includes(perm)
      );

      const permissionTags = newPermissions.map(
        (perm) => `    <uses-permission android:name="${perm}"/>`
      );

      if (permissionTags.length === 0) {
        resolve();
        return;
      }

      fs.writeFileSync(
        androidManifestPath,
        manifestContent.replace(
          permissionsAlreadyPresent?.[0] || "</manifest>",
          [permissionsAlreadyPresent?.[0] || "", ...permissionTags].join("\n")
        )
      );
    } catch (error) {
      console.error(chalk.red("Error modifying AndroidManifest.xml:"), error);
    }

    console.log(chalk.green("Permissions added to AndroidManifest.xml."));
    resolve();
  });
};

const modifyAndroidManifest = async (newServices: string | string[]) => {
  return new Promise<void>((resolve) => {
    const androidManifestPath = path.resolve(
      APP_PATH,
      "android",
      "app",
      "src",
      "main",
      "AndroidManifest.xml"
    );
    const backupPath = androidManifestPath + ".bak";

    fs.copyFileSync(androidManifestPath, backupPath);

    try {
      console.log(chalk.blue("Modifying AndroidManifest.xml..."));
      const manifestContent = fs.readFileSync(androidManifestPath, "utf8");
      const application = manifestContent.match(
        /<application.*<\/application>/s
      )?.[0];

      if (!application)
        throw new Error("No <application> tag found in AndroidManifest.xml");

      const services = Array.isArray(newServices) ? newServices : [newServices];

      const newApplication = application?.replace(
        "</application>",
        [...services, "</application>"].join("\n")
      );

      fs.writeFileSync(
        androidManifestPath,
        manifestContent.replace(application, newApplication)
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
  const androidPath = path.join(APP_PATH, "android");
  if (fs.existsSync(androidPath))
    fs.rmSync(androidPath, { recursive: true, force: true });

  if (!fs.existsSync(path.join(APP_PATH, "google-services.json")))
    throw new Error("Missing google-services.json file");

  try {
    console.log(chalk.blue("Running prebuild script..."));
    const output = execSync("npx expo prebuild --platform android --clean", {
      cwd: APP_PATH,
      env,
    })?.toString();

    if (!output?.includes("Finished prebuild"))
      throw new Error(["Prebuild failed", output].join("\n"));

    console.log(chalk.green("Prebuild completed successfully."));
    createModules();
  } catch (error) {
    console.error(chalk.red("Error running prebuild script:"), error);
  }
};

runPrebuild();
