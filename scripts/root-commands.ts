import path from "path";
import chalk from "chalk";
import { args } from "./arguments.ts";
import { Script } from "./common";
import { Helper } from "@commonSrc/both/index.ts";
import { Logger } from "@commonSrc/serverOrElectron/logger.ts";
import { formatFolder } from "./format-folder.ts";

const script = new Script();

export const run = async () => {
  const action = args.ARGS.action;
  if (!action) {
    throw new Error(
      "No action specified. Use --action=<action> or -h for help.",
    );
  }

  Logger.log(`Running root action: ${action}`);

  switch (action) {
    case "compile-check":
      if (!args.ARGS.testing) {
        const exec = new script.Exec();

        await exec.async
          .onData((chunk) => {
            Logger.log(
              chalk.magentaBright("Yarn app-prebuild-android: "),
              chunk,
            );
          })
          .run("yarn run app-prebuild-android", {
            env: process.env,
            cwd: script.PATHS.root,
          });

        await exec.async
          .onData((chunk) => {
            Logger.log(chalk.magentaBright("Gradle: "), chunk);
          })
          .run("cd android && ./gradlew :app:compileDebugKotlin --no-daemon", {
            env: process.env,
            cwd: script.PATHS.app,
          });
      } else {
        Logger.log("Testing mode: Skipping compile-check commands");
      }
      break;
    case "clean":
      await clean();
      break;
    case "clean-all":
      await clean();
      await installAll();
      break;
    case "format-all":
      await formatAll();
      break;
    case "app":
      if (!args.ARGS.testing) {
        const exec = new script.Exec();

        await exec.async
          .onData((chunk) => {
            Logger.log(chalk.magentaBright("Yarn expo start: "), chunk);
          })
          .run("yarn expo start -c", {
            env: process.env,
            cwd: script.PATHS.app,
          });
      } else {
        Logger.log("Testing mode: Skipping yarn expo start");
      }
      break;
    case "type-check":
      if (!args.ARGS.testing) {
        const exec = new script.Exec();

        await exec.async
          .onData((chunk) => {
            Logger.log(chalk.magentaBright("Type-check: "), chunk);
          })
          .run("yarn run type-check", {
            env: process.env,
            cwd: script.PATHS.app,
          });
      } else {
        Logger.log("Testing mode: Skipping yarn run type-check");
      }
      break;
    case "build-web": {
      const envWeb = {
        ...process.env,
        PLATFORM: "web",
        BUILD_PROFILE: process.env.BUILD_PROFILE || "production",
      };
      if (!args.ARGS.testing) {
        const exec = new script.Exec();

        await exec.async
          .onData((chunk) => {
            Logger.log(chalk.magentaBright("Yarn build web: "), chunk);
          })
          .run(
            `yarn expo export -c -p web ${envWeb.BUILD_PROFILE === "production" ? "" : "--dev --no-minify"}`,
            { env: envWeb, cwd: script.PATHS.app },
          );
      } else {
        Logger.log("Testing mode: Skipping yarn expo export");
      }
      break;
    }
    case "dev-frontend":
    case "dev-clipboard-frontend": {
      if (!args.ARGS.testing) {
        const envWeb = {
          ...process.env,
          TYPE_BUILD:
            action === "dev-clipboard-frontend" ? "clipboard" : "test",
          BUILD_PROFILE: "development",
        };

        const exec = new script.Exec();

        await exec.async
          .onData((chunk) => {
            Logger.log(chalk.magentaBright("Yarn dev: "), chunk);
          })
          .run("yarn run dev", {
            env: envWeb,
            cwd: script.PATHS.frontend,
          });
      } else {
        Logger.log("Testing mode: Skipping yarn run dev");
      }
      break;
    }
    case "build-frontend":
    case "build-clipboard-frontend": {
      if (!args.ARGS.testing) {
        const envWeb = {
          ...process.env,
          TYPE_BUILD:
            action === "build-clipboard-frontend" ? "clipboard" : "normal",
          BUILD_PROFILE: process.env.BUILD_PROFILE || "production",
        };
        const exec = new script.Exec();

        await exec.async
          .onData((chunk) => {
            Logger.log(chalk.magentaBright("Yarn build: "), chunk);
          })
          .run("yarn run build", {
            env: envWeb,
            cwd: script.PATHS.frontend,
          });
      } else {
        Logger.log("Testing mode: Skipping yarn run build");
      }
      break;
    }
    default:
      throw new Error(`Unknown action: ${action}`);
  }
};

export const clean = async () => {
  const dirs = [
    "dist",
    "build",
    ".expo",
    "android",
    "yarn.lock",
    "node_modules",
    "dist-electron",
  ];

  const pathsToClean = Object.values(script.PATHS).flatMap((p) =>
    dirs.map((d) => path.join(p, d)),
  );

  Logger.log("Cleaning paths...");
  await Helper.Arrays.forEachQueue(3, pathsToClean, async (p) => {
    const dir = new script.Directory(p);
    if (!(await dir.exists())) return;

    // eslint-disable-next-line no-console
    console.log(`Removing ${p}`);
    if (!args.ARGS.testing) {
      await dir.rm({ recursive: true, force: true });
    } else {
      // eslint-disable-next-line no-console
      console.log("Testing mode: Skipping folder removal");
    }
  });

  // eslint-disable-next-line no-console
  console.log("Cleaning yarn cache in app...");
  try {
    if (!args.ARGS.testing) {
      const exec = new script.Exec();

      await exec.async
        .onData((chunk) => {
          // eslint-disable-next-line no-console
          console.log(chalk.magentaBright("Yarn cache clean:"), chunk);
        })
        .run("yarn cache clean", {
          cwd: script.PATHS.root,
        });
    } else {
      // eslint-disable-next-line no-console
      console.log("Testing mode: Skipping yarn cache clean");
    }
  } catch (e) {
    // eslint-disable-next-line no-console
    console.warn(
      "Failed to clean yarn cache in app, continuing...",
      e instanceof Error ? e.message : e,
    );
  }
};

const installAll = async () => {
  // eslint-disable-next-line no-console
  console.log(`Installing dependencies in ${script.PATHS.root} using yarn...`);

  if (!args.ARGS.testing) {
    const exec = new script.Exec();

    await exec.async
      .onData((chunk) => {
        // eslint-disable-next-line no-console
        console.log(chalk.magentaBright("Yarn install:"), chunk);
      })
      .run("yarn install", {
        cwd: script.PATHS.root,
      });
  } else {
    // eslint-disable-next-line no-console
    console.log("Testing mode: Skipping yarn install");
  }
};

export const formatAll = async () => {
  await formatFolder(script.PATHS.root);
};

if (process.env.NODE_ENV !== "test") {
  run();
}
