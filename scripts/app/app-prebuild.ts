import path from "path";
import chalk from "chalk";
import { args } from "../arguments";
import { Script } from "../common";
import { Directory, File, Helper, Logger } from "@commonSrc/serverOrElectron";

const script = new Script();

const packageName = script.appConfig.android?.package;
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

const getPath = async (relativePath: string) => {
  const pathLocal = path.resolve(script.PATHS.app, relativePath);
  if (!(await new File(pathLocal).exists())) {
    Logger.log(
      chalk.yellow(
        `Creating directory: ${pathLocal} with relative path: ${relativePath}`,
      ),
    );
    if (!args.ARGS.testing) {
      await new Directory(pathLocal).mkdir({ recursive: true });
    }
  }

  return pathLocal;
};

script.addStep("Remove android directory", async () => {
  const android = new Directory(path.join(script.PATHS.app, "android"));

  if (!args.ARGS.testing) await android.rm({ recursive: true, force: true });
  else
    Logger.log(
      chalk.yellow("Testing mode: Skipping android directory removal"),
    );
});

script.addStep("Verify google-services.json", async () => {
  const googleServicesJson = new File(
    path.join(script.PATHS.app, "google-services.json"),
  );
  if (args.ARGS.testing) {
    Logger.log(
      chalk.yellow("Testing mode: Skipping google-services.json verification"),
    );
    return;
  }

  if (await googleServicesJson.exists()) return;

  if (typeof process.env.GOOGLE_SERVICES_JSON !== "string")
    throw new Error("Missing google-services.json file");

  await googleServicesJson.writeFile(
    Buffer.from(process.env.GOOGLE_SERVICES_JSON, "base64"),
  );
});

script.addStep("Run yarn expo prebuild", async () => {
  if (!args.ARGS.testing) {
    const exec = new script.Exec();

    exec.async.onData((chunk) => {
      Logger.log(chalk.cyan("Prebuild: "), chunk);
    });

    await exec.async.run("yarn expo prebuild --platform android --clean", {
      cwd: script.PATHS.app,
      env: {
        ...process.env,
        PLATFORM: "android",
        BUILD_PROFILE: process.env.BUILD_PROFILE || "production",
      },
    });

    const android = new Directory(path.join(script.PATHS.app, "android"));
    if (!(await android.exists()))
      throw new Error("Android directory not found");
  } else {
    Logger.log(chalk.yellow("Testing mode: Skipping yarn expo prebuild"));
  }
});

script.addStep("Create modules", async () => {
  const { default: modules } = await import("@appSrc/native/modules.json");

  await Helper.Arrays.forEachQueue(3, modules, async (module) => {
    const modulePath = await getPath(module.initPath);

    let files: string[];

    if (!module.name) {
      files = await new Directory(modulePath).readDir();
      if (files.length === 0) {
        Logger.warn(
          chalk.yellow(
            `No files found in ${modulePath} for module with name: ${module.name}`,
          ),
        );
        return;
      }
    } else files = [module.name];

    if (!files) return;

    await Helper.Arrays.forEachQueue(3, files, async (name) => {
      const file = new File(path.resolve(modulePath, name));
      if (!(await file.exists()))
        throw new Error(`Module file not found: ${name} in ${modulePath}`);

      const destFile = new File(
        path.resolve(await getPath(module.finalPath), name),
      );
      await destFile.mkdir({ recursive: true });

      if (!args.ARGS.testing) {
        const content = await file
          .readFile("utf8")
          .then((c) => c.replace(/com\.package\.name/g, packageName));

        await destFile.writeFile(content, "utf8");
      } else {
        Logger.log(
          chalk.yellow(`Testing mode: Skipping module write for ${name}`),
        );
      }
    });
  });
});

script.addStep("Add intents to AndroidManifest", async () => {
  const androidManifestPath = path.resolve(
    script.PATHS.app,
    "android",
    "app",
    "src",
    "main",
    "AndroidManifest.xml",
  );

  const manifest = new File(androidManifestPath);
  let manifestContent = await manifest.readFile("utf8");

  const activity = manifestContent
    .match(/<activity[\s\S]*<\/activity>/g)
    ?.find((act) => act.includes("MainActivity"));
  if (!activity)
    throw new Error("MainActivity not found in AndroidManifest.xml");

  manifestContent = manifestContent.replace(
    activity,
    activity.replace("</activity>", INTENTS_TO_ADD + "\n</activity>"),
  );

  if (args.ARGS.testing) {
    Logger.log(
      chalk.yellow(
        "Testing mode: Skipping AndroidManifest.xml permissions write",
      ),
    );
    return;
  }

  await manifest.writeFile(manifestContent);
});

script.addStep("Modify AndroidManifest", async () => {
  const { default: modules } = await import("@appSrc/native/modules.json");
  const services = modules.map((m) => m.service || "").filter(Boolean);

  const androidManifestPath = path.resolve(
    script.PATHS.app,
    "android",
    "app",
    "src",
    "main",
    "AndroidManifest.xml",
  );

  const manifest = new File(androidManifestPath);

  const manifestContent = await manifest.readFile("utf8");
  const application = manifestContent.match(
    /<application.*<\/application>/s,
  )?.[0];

  if (!application) {
    throw new Error("No <application> tag found in AndroidManifest.xml");
  }

  const newApplication = application.replace(
    "</application>",
    [...services, "</application>"].join("\n"),
  );

  if (args.ARGS.testing) {
    Logger.log(
      chalk.yellow("Testing mode: Skipping AndroidManifest.xml modification"),
    );
  } else {
    manifest.writeFile(manifestContent.replace(application, newApplication));
  }
});

script.addStep("Edit MainApplication", async () => {
  const mainApplicationPath = await getPath(
    `android/app/src/main/java/${packageName.replace(
      /\./g,
      "/",
    )}/MainApplication.kt`,
  );

  const mainApplication = new File(mainApplicationPath);

  const mainApplicationContent = await mainApplication.readFile("utf8");
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

  const getPackagesRegex = /PackageList\(this\)\.packages\.apply[^}]+}/g;
  const getPackagesMatch = newContent.match(getPackagesRegex)?.[0];

  if (!getPackagesMatch) {
    Logger.error(
      chalk.red("Could not find getPackages function"),
      "add manual package in MainApplication.kt fun getPackages()",
    );
    return;
  }

  const curlyBraces = getPackagesMatch.match(/{[^}]*}/g)?.[0];
  if (!curlyBraces) {
    Logger.error(
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

  if (args.ARGS.testing) {
    Logger.log(chalk.yellow("Testing mode: Skipping MainApplication.kt write"));
    return;
  }

  await mainApplication.writeFile(
    newContent.replace(curlyBraces, (match) => {
      const packagesNotAdded = packages.filter((pkg) => !match.includes(pkg));
      match = packagesNotAdded.map((p) => `add(${p})`).join("\n");

      return `{\n${match}\n}`;
    }),
  );
});

script.addStep("Add dependencies", async () => {
  const buildGradle = new File(await getPath("android/app/build.gradle"));
  const buildGradleContent = await buildGradle.readFile("utf8");

  const dependenciesToAdd = [
    'implementation("org.jetbrains.kotlinx:kotlinx-coroutines-android:1.7.3")',
    'implementation("org.bouncycastle:bcprov-jdk15to18:1.78.1")',
    'implementation("com.jakewharton.timber:timber:5.0.1")',
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

  if (args.ARGS.testing) {
    Logger.log(
      chalk.yellow("Testing mode: Skipping build.gradle dependencies write"),
    );
    return;
  }

  await buildGradle.writeFile(newContent);
});

script.addStep("Edit packaging options", async () => {
  const buildGradle = new File(await getPath("android/app/build.gradle"));
  const buildGradleContent = await buildGradle.readFile("utf8");

  const match = buildGradleContent.match(/packagingOptions\s*{[^}]*}/g)?.[0];
  if (!match) {
    Logger.error(
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

  if (args.ARGS.testing) {
    Logger.log(chalk.yellow("Testing mode: Skipping build.gradle write"));
    return;
  }

  await buildGradle.writeFile(buildGradleContent.replace(match, newBlock));
});

script.addStep("add to xml", async () => {
  const stringsXMLPathEn = await getPath(
    "android/app/src/main/res/values/strings.xml",
  );
  const stringsXMLPathEs = await getPath(
    "android/app/src/main/res/values-es/strings.xml",
  );
  const stringsPathNative = await getPath("native/strings.xml");

  const stringsNative = await new File(stringsPathNative).readFile("utf8");

  const es = stringsNative.match(/<es>[\s\S]*<\/es>/g)?.[0];
  const en = stringsNative.match(/<en>[\s\S]*<\/en>/g)?.[0];

  if (!es || !en) {
    Logger.error(
      chalk.red("Could not find <en> or <es> sections in native strings.xml"),
    );
    return;
  }

  const stringsDefault = await new File(stringsXMLPathEn).readFile("utf8");

  const newEn = stringsDefault.replace(
    /<\/(resource|resources)>/g,
    `${en.replace(/<\/?en>/g, "").trim()}\n</$1>`,
  );

  const newEs = stringsDefault.replace(
    /<\/(resource|resources)>/g,
    `${es.replace(/<\/?es>/g, "").trim()}\n</$1>`,
  );

  if (args.ARGS.testing) {
    Logger.log(chalk.yellow("Testing mode: Skipping strings.xml write"));
    return;
  }

  await Promise.all([
    await new File(stringsXMLPathEn).writeFile(newEn),
    await new File(stringsXMLPathEs).writeFile(newEs),
  ]);
});

script.addStep("Edit memory settings", async () => {
  const gradleProperties = new File(
    path.resolve(script.PATHS.app, "android", "gradle.properties"),
  );

  let content = await gradleProperties.readFile("utf8");
  if (!content.includes("org.gradle.jvmargs")) {
    content += `\norg.gradle.jvmargs=${script.gradleOpts}\n`;
  } else {
    const match = content.match(/org\.gradle\.jvmargs=[^\n]*/);
    if (!match) {
      throw new Error("Could not find org.gradle.jvmargs in gradle.properties");
    }

    content = content.replace(
      match[0],
      `org.gradle.jvmargs=${script.gradleOpts}`,
    );
  }

  if (!args.ARGS.testing) {
    await gradleProperties.writeFile(content);
  }
});

if (process.env.NODE_ENV !== "test") {
  script.run();
}

export { script };
