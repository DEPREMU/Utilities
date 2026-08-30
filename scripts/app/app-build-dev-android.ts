import path from "path";
import chalk from "chalk";
import { spawn } from "child_process";
import { Script } from "../common";
import { Logger } from "@commonSrc/serverOrElectron";
import { env, args, APP_PATH } from "../config";

const localEnv = {
  ...env,
  PLATFORM: "android",
  BUILD_PROFILE: "development",
};

const script = new Script(() => {
  Logger.log("Finished app-build-dev-android script.");
  killProcessTree(expo);

  if (script.PLATFORM.isWindows) return;

  Logger.log("Cleaning up java processes...");
  spawn("pkill", ["-f", "java"]);
});

const killProcessTree = (child?: ReturnType<typeof spawn> | null): void => {
  if (!child || child.killed || child.exitCode !== null) return;

  if (script.PLATFORM.isWindows && child.pid) {
    spawn("taskkill", ["/PID", `${child.pid}`, "/T", "/F"], {
      stdio: "ignore",
    });
    return;
  }

  child.kill("SIGINT");
};

let expo: ReturnType<typeof spawn>;

const spawnCommand = (
  command: string,
  argsList: string[],
  options: Parameters<typeof spawn>[2] = {},
): ReturnType<typeof spawn> => {
  return spawn(command, argsList, {
    ...options,
    shell: script.PLATFORM.isWindows,
    stdio: "inherit",
  });
};

script.addValue("androidPath", path.join(APP_PATH, "android"));

if (!args.ARGS["skip-build-android"]) {
  script.addStep("Remove android directory", async () => {
    await new script.Directory(script.getValue("androidPath") as string).rm({
      recursive: true,
      force: true,
    });
  });

  script.addStep("Run prebuild", async () => {
    const exec = new script.Exec();

    await exec.async
      .onData((chunk) => {
        Logger.log(chalk.magentaBright("Prebuild:"), chunk);
      })
      .run("yarn run app-prebuild-android");
  });

  script.addStep("Run android build", async (_, abortController) => {
    Logger.log("Running android build...");
    expo = spawnCommand(
      script.PLATFORM.isWindows ? "yarn" : "taskset",
      script.PLATFORM.isWindows
        ? ["expo", "run:android", "--no-build-cache"]
        : ["-c", "0-5", "yarn", "expo", "run:android", "--no-build-cache"],
      { cwd: APP_PATH, env: localEnv, signal: abortController.signal },
    );
  });
} else {
  script.addStep("Run expo", (_, abortController) => {
    Logger.log("Running expo...");

    expo = spawnCommand("expo", ["start", "--clear", "--dev-client"], {
      cwd: APP_PATH,
      env: localEnv,
      signal: abortController.signal,
    });
  });
}
