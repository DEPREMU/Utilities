/* eslint-disable no-console */
import fs from "fs";
import path from "path";
import chalk from "chalk";
import { execSync } from "child_process";
import { APP_CONFIG, APP_PATH, env } from "../config.ts";

const packageName = APP_CONFIG.android?.package;
if (!packageName) throw new Error("Package name not found in app config");

const INTENTS_TO_ADD = `    
    <intent-filter>
    <action android:name="android.intent.action.VIEW" />
    <category android:name="android.intent.category.DEFAULT" />
    <category android:name="android.intent.category.BROWSABLE" />

    <data
      android:mimeType="application/pdf"
      android:scheme="content" />
    <data
      android:mimeType="application/pdf"
      android:scheme="file" />
    </intent-filter>
`;

const getPath = (relativePath: string) => {
  const pathLocal = path.resolve(APP_PATH, relativePath);
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

const addStringToXML = async () => {
  const stringsXMLPathEn = getPath(
    "android/app/src/main/res/values/strings.xml",
  );
  const stringsXMLPathEs = getPath("android/app/src/main/res/values-es");
  const stringsPathNative = getPath("native/strings.xml");

  const stringsNative = fs.readFileSync(stringsPathNative, "utf8");

  const es = stringsNative.match(/<es>[\s\S]*<\/es>/g)?.[0];
  const en = stringsNative.match(/<en>[\s\S]*<\/en>/g)?.[0];

  if (!es || !en) {
    console.error(
      chalk.red("Could not find <en> or <es> sections in native strings.xml"),
    );
    return;
  }

  const stringsDefault = fs.readFileSync(stringsXMLPathEn, "utf8");

  const newEn = stringsDefault.replace(
    /<\/(resource|resources)>/g,
    `${en.replace(/<\/?en>/g, "").trim()}\n</$1>`,
  );

  const newEs = stringsDefault.replace(
    /<\/(resource|resources)>/g,
    `${es.replace(/<\/?es>/g, "").trim()}\n</$1>`,
  );

  fs.writeFileSync(stringsXMLPathEn, newEn);
  fs.writeFileSync(path.join(stringsXMLPathEs, "strings.xml"), newEs);
};

const editPackagingOptions = async () => {
  const buildGradlePath = getPath("android/app/build.gradle");
  const buildGradleContent = fs.readFileSync(buildGradlePath, "utf8");

  const match = buildGradleContent.match(/packagingOptions\s*{[^}]*}/g)?.[0];
  if (!match) {
    console.error(
      chalk.red("Could not find packagingOptions block in build.gradle"),
    );
    return;
  }

  const newBlock = match.replace(
    "{",
    `{
        pickFirst "lib/arm64-v8a/libcrypto.so"
        pickFirst "lib/armeabi-v7a/libcrypto.so"
        pickFirst "lib/x86/libcrypto.so"
        pickFirst "lib/x86_64/libcrypto.so"\n`,
  );

  fs.writeFileSync(
    buildGradlePath,
    buildGradleContent.replace(match, newBlock),
  );
};

const addDependencies = async () => {
  console.log(chalk.blue("Adding dependencies to build.gradle..."));

  const buildGradlePath = getPath("android/app/build.gradle");
  const buildGradleContent = fs.readFileSync(buildGradlePath, "utf8");

  const dependenciesToAdd = [
    'implementation("org.jetbrains.kotlinx:kotlinx-coroutines-android:1.7.3")',
    'implementation("org.bouncycastle:bcprov-jdk15to18:1.78.1")',
  ];

  let newContent = buildGradleContent;

  dependenciesToAdd.forEach((dependency) => {
    if (!newContent.includes(dependency)) {
      newContent = newContent.replace(
        /dependencies\s*{/,
        `dependencies {\n    ${dependency}`,
      );
    }
  });

  fs.writeFileSync(buildGradlePath, newContent);
  console.log(chalk.green("Dependencies added to build.gradle."));
};

const editMainApplication = async () => {
  console.log(chalk.blue("Editing MainApplication.kt..."));

  const mainApplicationPath = getPath(
    `android/app/src/main/java/${packageName.replace(
      /\./g,
      "/",
    )}/MainApplication.kt`,
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
    }),
  );
  console.log(chalk.green("MainApplication.kt edited successfully."));
};

const createModules = async () => {
  const modulesPath = getPath("native/modules.json");

  console.log(chalk.blue("Creating native modules..."));
  const modules = JSON.parse(fs.readFileSync(modulesPath, "utf8")) as {
    name: string | string[];
    content: string;
    service?: string;
    initPath: string;
    finalPath: string;
    permissions?: string[];
  }[];

  modules.forEach((module) => {
    const modulePath = getPath(module.initPath);

    [...(Array.isArray(module.name) ? module.name : [module.name])].forEach(
      (name) => {
        if (!fs.existsSync(path.resolve(modulePath, name)))
          throw new Error(`Module file not found: ${name} in ${modulePath}`);

        const content = fs
          .readFileSync(path.resolve(modulePath, name), "utf8")
          .replace(/com\.package\.name/g, packageName);

        const finalPath =
          module.finalPath +
          (name.endsWith(".kt") ? packageName.replace(/\./g, "/") : "");

        fs.writeFileSync(path.resolve(getPath(finalPath), name), content, {
          encoding: "utf8",
        });
      },
    );
  });
  console.log(chalk.green("Native modules created successfully."));

  await modifyAndroidManifest(modules.map((m) => m.service || ""));
  await addPermissionsToManifest(modules.flatMap((m) => m.permissions || []));
  await editMainApplication();
  await addDependencies();
  await editPackagingOptions();
  await addStringToXML();
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
      "AndroidManifest.xml",
    );

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

      let newManifestContent = manifestContent.replace(
        permissionsAlreadyPresent?.[0] || "</manifest>",
        [permissionsAlreadyPresent?.[0] || "", ...permissionTags].join("\n"),
      );

      const activity = manifestContent
        .match(/<activity[\s\S]*<\/activity>/g)
        ?.find((act) => act.includes("MainActivity"));
      if (!activity)
        throw new Error("MainActivity not found in AndroidManifest.xml");

      newManifestContent = newManifestContent.replace(
        activity,
        activity.replace("</activity>", INTENTS_TO_ADD + "\n</activity>"),
      );

      permissionTags.push("");

      if (!permissionTags.length) {
        resolve();
        return;
      }

      fs.writeFileSync(androidManifestPath, newManifestContent);
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

      const newApplication = application.replace(
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
  const androidPath = path.join(APP_PATH, "android");
  if (fs.existsSync(androidPath))
    fs.rmSync(androidPath, { recursive: true, force: true });

  if (!fs.existsSync(path.join(APP_PATH, "google-services.json")))
    throw new Error("Missing google-services.json file");

  try {
    console.log(chalk.blue("Running prebuild script..."));
    const output = execSync("yarn expo prebuild --platform android --clean", {
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
