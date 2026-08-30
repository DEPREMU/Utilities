import {
  args,
  UTILITIES_PATH,
  UTILITIES_FOR_PC_PATH,
  PACKAGE_JSON_UtilitiesForPC,
} from "../config.ts";
import path from "path";
import chalk from "chalk";
import { t } from "./translations.ts";
import { Script } from "../common.ts";
import { Logger } from "@commonSrc/serverOrElectron/logger.ts";
import { Directory } from "@commonSrc/serverOrElectron/fs.ts";

const TEMP_FOLDER = path.join(
  UTILITIES_PATH,
  "..",
  ".temp-utilities-for-pc-build",
);

const dataBuild = {
  distElectron: path.join(
    TEMP_FOLDER,
    PACKAGE_JSON_UtilitiesForPC.build.directories.output,
  ),
  appName: PACKAGE_JSON_UtilitiesForPC.name,
  productName: PACKAGE_JSON_UtilitiesForPC.build.productName,
} as const;

let executeCleanup = false;

export const script = new Script(async (err) => {
  if (!executeCleanup) return;

  if (err) Logger.error("An error occurred:", err.message);

  if (!args.ARGS.yes && !args.ARGS.testing && !args.ARGS.ci)
    await script.ask("Press enter to exit...", -1);

  if (!args.ARGS.testing)
    await new script.Directory(TEMP_FOLDER).rm({
      recursive: true,
      force: true,
    });
});

script.elevate(
  `cd ${UTILITIES_PATH}; yarn run build-app-electron ${args.getArgs()}; pause`,
);

script.addStep("Clean up temp dir", async (instance) => {
  const dir = new instance.Directory(TEMP_FOLDER);
  const res = await dir.rm({ recursive: true, force: true });

  if (!res) throw new Error(`Failed to remove temp dir: ${dir}`);

  await dir.mkdir({ recursive: true });
});

script.addStep(
  "Building electron resources",
  async (instance, abortController) => {
    if (!args.ARGS.testing) {
      const exec = new instance.Exec();

      await exec.async
        .onData((chunk) => {
          Logger.log(chalk.blueBright("Building electron resources: "), chunk);
        })
        .run(
          `yarn run build-resources-electron --isWindows=${instance.PLATFORM.isWindows}`,
          { signal: abortController.signal },
        );
    } else {
      Logger.log("Testing mode: Skipping build-resources-electron");
    }
  },
);

script.addStep("Building web app", async (instance, abortController) => {
  if (!args.ARGS.testing) {
    const exec = new instance.Exec();

    await exec.async
      .onData((chunk) => {
        Logger.log(chalk.blueBright("Building web app: "), chunk);
      })
      .run("yarn run build-web-app-electron", {
        signal: abortController.signal,
      });
  } else {
    Logger.log("Testing mode: Skipping build-web-app-electron");
  }
});

script.addStep("Init temp folder", async (instance) => {
  const PATHS = [
    path.join(UTILITIES_FOR_PC_PATH, "dist"),
    path.join(UTILITIES_FOR_PC_PATH, "build"),
    path.join(UTILITIES_FOR_PC_PATH, "assets"),
    path.join(UTILITIES_FOR_PC_PATH, "package.json"),
  ];

  await Promise.all(
    PATHS.map(async (localPath) => {
      const tempPath = path.join(TEMP_FOLDER, path.basename(localPath));

      if (localPath.endsWith("package.json")) {
        const file = new instance.File(localPath);

        if (!(await file.exists()))
          throw new Error(`Failed to find a file required for build: ${file}`);

        const result = await file.copyFile(tempPath);
        if (result instanceof Error) throw result;

        return;
      }

      const dir = new instance.Directory(localPath);

      if (!(await dir.exists()))
        throw new Error(`Failed to find a folder required for build: ${dir}`);
      let res: Directory | Error;
      if (localPath.endsWith("assets")) res = await dir.copyDir(tempPath);
      else res = await dir.rename(tempPath);

      if (res instanceof Error) throw res;
    }),
  );

  executeCleanup = true;
});

script.addStep("Install dependencies", async (instance, abortController) => {
  if (!args.ARGS.testing) {
    const exec = new instance.Exec();

    await exec.async
      .onData((chunk) => {
        Logger.log(chalk.blueBright("Installing dependencies: "), chunk);
      })
      .run("yarn install --ignore-optional", {
        cwd: TEMP_FOLDER,
        signal: abortController.signal,
      });
  } else {
    Logger.log("Testing mode: Skipping yarn install in temp folder");
  }
});

script.addStep("Build electron app", async (instance, abortController) => {
  if (instance.PLATFORM.isWindows) {
    Logger.log("Building windows executable");

    if (!args.ARGS.testing) {
      const exec = new instance.Exec();

      await exec.async
        .onData((chunk) => {
          Logger.log(chalk.blueBright("Building electron app: "), chunk);
        })
        .run("yarn electron-builder --win", {
          cwd: TEMP_FOLDER,
          signal: abortController.signal,
        });
    } else {
      Logger.log("Testing mode: Skipping electron-builder --win");
    }
  } else if (instance.PLATFORM.isLinux) {
    Logger.log(chalk.cyan("Building linux package"));

    Logger.log(chalk.cyan("Installing linux dependencies"));
    try {
      if (!args.ARGS.testing) {
        const command =
          "sudo apt install -y build-essential fakeroot dpkg-dev libgtk-3-0 libnotify4 libnss3 libxss1 libxtst6 xdg-utils libatspi2.0-0 libuuid1 libsecret-1-0 libappindicator3-1 gnome-keyring libsecret-tools; sudo apt update -y; sudo apt upgrade -y";

        const exec = new instance.Exec();

        await exec.async
          .onData((chunk) => {
            Logger.log(
              chalk.blueBright("Installing linux dependencies: "),
              chunk,
            );
          })
          .run(command, {
            cwd: TEMP_FOLDER,
            signal: abortController.signal,
          });
      } else {
        Logger.log("Testing mode: Skipping apt install");
      }
    } catch {
      Logger.log(t("someDependenciesInstalled"));
    }

    if (!args.ARGS.testing) {
      const exec = new instance.Exec();

      await exec.async
        .onData((chunk) => {
          Logger.log(chalk.blueBright("Building electron app: "), chunk);
        })
        .run("yarn electron-builder --linux deb", {
          cwd: TEMP_FOLDER,
          signal: abortController.signal,
        });
    } else {
      Logger.log("Testing mode: Skipping electron-builder --linux deb");
    }
  }
});

script.addStep("Move app", async (instance) => {
  const extension = instance.PLATFORM.isWindows ? ".exe" : ".deb";

  const destFile = new instance.File(
    path.join(
      UTILITIES_FOR_PC_PATH,
      "dist-electron",
      `${dataBuild.appName}${extension}`,
    ),
  );
  if (await destFile.exists()) await destFile.rm({ force: true });
  else await destFile.mkdir();

  const files = await new instance.Directory(dataBuild.distElectron).readDir();

  const appPackage = files.find((file) => file.endsWith(extension));

  if (!appPackage)
    throw new Error(
      `Failed to find the built package: ${JSON.stringify(files, null, 2)}`,
    );

  const sourceFile = new instance.File(
    path.join(dataBuild.distElectron, appPackage),
  );

  if (!args.ARGS.testing && !(await sourceFile.exists()))
    throw new Error(
      `Failed to find the built package: ${sourceFile.path}: ${JSON.stringify(
        files,
        null,
        2,
      )}`,
    );

  if (!args.ARGS.testing) {
    const success = await sourceFile.rename(destFile);

    if (!success)
      throw new Error(
        `Failed to rename file: ${JSON.stringify({ sourcePath: sourceFile.path, destinationPath: destFile.path }, null, 2)}`,
      );
  } else {
    Logger.log("Testing mode: Skipping rename dist-electron package");
  }

  Logger.log(
    chalk.green(
      `Build moved successfully to ${path.join(
        UTILITIES_FOR_PC_PATH,
        "dist-electron",
      )}`,
    ),
  );
});

if (process.env.NODE_ENV !== "test") {
  script.run();
}
