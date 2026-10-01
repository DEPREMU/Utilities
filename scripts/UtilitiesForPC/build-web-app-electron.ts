import path from "path";
import chalk from "chalk";
import { t } from "./translations.ts";
import { args } from "../arguments";
import { Script } from "../common";
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
      cwd: script.PATHS.root,
      signal: abortController.signal,
    });
});

script.addStep("Export Clipboard App", async (_, abortController) => {
  const distDir = new script.Directory(
    path.resolve(script.PATHS.utilitiesForPC, "assets", "clipboard"),
  );
  const frontendDistDir = new script.Directory(
    path.resolve(script.PATHS.frontend, "dist"),
  );

  if (await distDir.exists())
    await distDir.rm({ recursive: true, force: true });

  const exec = new script.Exec();

  await exec.async
    .onData((chunk) => {
      Logger.log(chalk.blueBright("Building clipboard frontend: "), chunk);
    })
    .run("yarn run build-clipboard-frontend", {
      cwd: script.PATHS.root,
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
      cwd: script.PATHS.root,
      signal: abortController.signal,
    });

  if (!stdout.includes("Exported: dist"))
    throw new Error(
      `Failed to build web app: \n${chalk.underlineBlue(stdout)}`,
    );
});

script.addStep("Clean up old build directories", async () => {
  await new script.Directory(
    path.resolve(script.PATHS.utilitiesForPC, "dist"),
  ).rm({
    force: true,
    recursive: true,
  });
});

script.addStep("Prepare files for electron app", async () => {
  const distPath = path.resolve(script.PATHS.utilitiesForPC, "dist");
  const sourcePath = path.resolve(script.PATHS.app, "dist");

  const sourceDir = new script.Directory(sourcePath);

  const res = await sourceDir.copyDir(distPath);
  if (res instanceof Error) throw res;

  await sourceDir.rm({ force: true, recursive: true });
});

script.run();
