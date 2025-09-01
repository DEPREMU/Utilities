import dotenv from "dotenv";
import fs from "fs";
import path from "path";
import { execSync } from "child_process";

dotenv.config({ path: "../.env" });

let __dirname = path.resolve();
if (__dirname.endsWith("app")) __dirname = path.join(__dirname, "..");

const isWindows = process.platform === "win32";

const getPath = (relativePath: string) => {
  return path.resolve(__dirname, relativePath);
};

const editMainApplication = async () => {
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
      "import com.utilities.depremu.ClipboardModule",
      "",
    ].join("\n"),
  );

  const getPackagesRegex =
    /override fun getPackages\(\): List<ReactPackage> \{[^}]*\}/s;
  const getPackagesMatch = newContent.match(getPackagesRegex)?.[0];

  if (!getPackagesMatch) {
    console.error(
      "Could not find getPackages function",
      "add manual package in MainApplication.kt fun getPackages()",
    );
    return;
  }

  fs.writeFileSync(
    mainApplicationPath,
    newContent.replace(getPackagesMatch, (match) => {
      return match
        .replace(".packages", ".packages.toMutableList()")
        .replace(
          "return packages",
          "packages.add(ClipboardPackage())\nreturn packages",
        );
    }),
  );
};

const createModules = async () => {
  const modulesPath = getPath("app/native/modules/modules.json");

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
          "SUPABASE_URL or SUPABASE_KEY is not defined in environment variables",
        );
        return;
      }
      const newContent = content
        .replace("{{supabaseUrl}}", process.env.SUPABASE_URL)
        .replace("{{supabaseKey}}", process.env.SUPABASE_KEY);
      fs.writeFileSync(path.resolve(module.finalPath, module.name), newContent);

      return;
    }

    fs.copyFileSync(
      path.join(modulePath, module.name),
      path.join(module.finalPath, module.name),
    );
  });

  await modifyAndroidManifest(modules.map((m) => m.service || ""));
  await addPermissionsToManifest(modules.flatMap((m) => m.permissions || []));
  await editMainApplication();
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
      const manifestContent = fs.readFileSync(androidManifestPath, "utf8");
      const permissionsAlreadyPresent = manifestContent
        .match(/<uses-permission ([^\n]+)/g)
        ?.map((match) => match.replace("\n", "").trim());
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
      console.error("Error modifying AndroidManifest.xml:", error);
      fs.copyFileSync(backupPath, androidManifestPath);
    }

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
      console.error("Error modifying AndroidManifest.xml:", error);
      fs.copyFileSync(backupPath, androidManifestPath);
    }

    resolve();
  });
};

const runPrebuild = async () => {
  const projectRoot = path.resolve(__dirname, "app");
  const commands = [`cd ${projectRoot}`, "npm i", "npx expo prebuild"];
  if (!projectRoot.endsWith("app"))
    throw new Error("Project root does not end with 'app'");

  try {
    const output = execSync(
      commands.join(isWindows ? " && " : " ; "),
    )?.toString();

    if (!output?.includes("Finished prebuild"))
      throw new Error(["Prebuild failed", output].join("\n"));

    createModules();
  } catch (error) {
    console.error("Error running prebuild script:", error);
  }
};

runPrebuild();
