import {
  args,
  APP_PATH,
  FRONTEND_PATH,
  UTILITIES_PATH,
  UTILITIES_FOR_PC_PATH,
} from "../config.ts";
import path from "path";
import chalk from "chalk";
import { t } from "./translations.ts";
import { Script } from "../common.ts";
import { Logger } from "@commonSrc/serverOrElectron/logger";
import { Directory } from "@commonSrc/serverOrElectron/fs";

const script = new Script();

script.addStep("Install dependencies", async (_, abortController) => {
  const exec = new script.Exec();

  await exec.async
    .onData((chunk) => {
      Logger.log(chalk.blueBright("Installing dependencies: "), chunk);
    })
    .run("yarn install", {
      cwd: UTILITIES_PATH,
      signal: abortController.signal,
    });
});

script.addStep("Export Clipboard App", async (_, abortController) => {
  const distDir = new script.Directory(
    path.resolve(UTILITIES_FOR_PC_PATH, "assets", "clipboard"),
  );
  const frontendDistDir = new script.Directory(
    path.resolve(FRONTEND_PATH, "dist"),
  );

  if (await distDir.exists())
    await distDir.rm({ recursive: true, force: true });

  const exec = new script.Exec();

  await exec.async
    .onData((chunk) => {
      Logger.log(chalk.blueBright("Building clipboard frontend: "), chunk);
    })
    .run("yarn run build-clipboard-frontend", {
      cwd: UTILITIES_PATH,
      signal: abortController.signal,
    });

  if (!(await frontendDistDir.exists()))
    throw new Error(t("failedToBuildWebApp") + frontendDistDir.path);

  script.addValue("DistDirPath", distDir.path);
  script.addValue("FrontendDir", frontendDistDir);
});

script.addStep("Move clipboard frontend to assets", async () => {
  const distDirPath = script.getValue("DistDirPath") as string;
  const frontendDistDir = script.getValue("FrontendDir") as Directory;

  await frontendDistDir.copyDir(distDirPath);
  await frontendDistDir.rm({ recursive: true, force: true });
});

script.addStep("Export Web App", async (_, abortController) => {
  const exec = new script.Exec();

  let stdout = "";

  await exec.async
    .onData((chunk) => {
      stdout += chunk;

      Logger.log(chalk.blueBright("Building web app: "), chunk);
    })
    .run(`yarn run build-web ${args.getArgs()}`, {
      cwd: UTILITIES_PATH,
      signal: abortController.signal,
    });

  if (!stdout.includes("Exported: dist"))
    throw new Error(
      `Failed to build web app: \n${chalk.underlineBlue(stdout)}`,
    );
});

script.addStep("Clean up old build directories", async () => {
  await new script.Directory(path.resolve(UTILITIES_FOR_PC_PATH, "dist")).rm({
    force: true,
    recursive: true,
  });
});

script.addStep("Prepare files for electron app", async () => {
  const distPath = path.resolve(UTILITIES_FOR_PC_PATH, "dist");
  const sourcePath = path.resolve(APP_PATH, "dist");

  const sourceDir = new script.Directory(sourcePath);

  const res = await sourceDir.copyDir(distPath);
  if (res instanceof Error) throw res;

  await sourceDir.rm({ force: true, recursive: true });
});

script.run();
