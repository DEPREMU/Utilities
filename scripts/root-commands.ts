import {
  env,
  args,
  APP_PATH,
  TYPES_PATH,
  SERVER_PATH,
  SCRIPTS_PATH,
  UTILITIES_PATH,
  UTILITIES_FOR_PC_PATH,
} from "./config.ts";
import fs from "fs";
import path from "path";
import { Logger } from "@commonSrc/serverOrElectron/logger.ts";
import { execSync } from "child_process";
import { formatFolder } from "./format-folder.ts";
import { Helper } from "@commonSrc/both/index.ts";

const PATHS = {
  App: APP_PATH,
  Types: TYPES_PATH,
  Server: SERVER_PATH,
  Scripts: SCRIPTS_PATH,
  UtilitiesForPC: UTILITIES_FOR_PC_PATH,
} as const;

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
        execSync("yarn run app-prebuild-android", {
          cwd: UTILITIES_PATH,
          stdio: "inherit",
          env,
        });
        execSync(
          "cd android && ./gradlew :app:compileDebugKotlin --no-daemon",
          {
            cwd: APP_PATH,
            stdio: "inherit",
            env,
          },
        );
      } else {
        Logger.log("Testing mode: Skipping compile-check commands");
      }
      break;
    case "clean":
      clean();
      break;
    case "clean-all":
      await clean();
      installAll();
      break;
    case "format-all":
      formatAll();
      break;
    case "app":
      if (!args.ARGS.testing) {
        execSync("yarn expo start -c", {
          cwd: APP_PATH,
          stdio: "inherit",
          env,
        });
      } else {
        Logger.log("Testing mode: Skipping yarn expo start");
      }
      break;
    case "server":
      if (!args.ARGS.testing) {
        execSync("yarn run start", {
          cwd: SERVER_PATH,
          stdio: "inherit",
          env: { ...env, SERVER_OR_ELECTRON: "server" },
        });
      } else {
        Logger.log("Testing mode: Skipping server start");
      }
      break;
    case "server-dev":
      if (!args.ARGS.testing) {
        execSync("yarn run start-dev", {
          cwd: SERVER_PATH,
          stdio: "inherit",
          env: { ...env, SERVER_OR_ELECTRON: "server" },
        });
      } else {
        Logger.log("Testing mode: Skipping server-dev start");
      }
      break;
    case "type-check":
      execSync("yarn run type-check", { cwd: APP_PATH, stdio: "inherit", env });
      break;
    case "build-web": {
      const envWeb = {
        ...env,
        PLATFORM: "web",
        BUILD_PROFILE: env.BUILD_PROFILE || "production",
      };
      if (!args.ARGS.testing) {
        execSync(
          `yarn expo export -c -p web ${envWeb.BUILD_PROFILE === "production" ? "" : "--dev --no-minify"}`,
          {
            env: envWeb,
            cwd: APP_PATH,
            stdio: "inherit",
          },
        );
      } else {
        Logger.log("Testing mode: Skipping yarn expo export");
      }
      break;
    }
    default:
      throw new Error(`Unknown action: ${action}`);
  }
};

export const clean = async () => {
  const pathsToClean = [
    path.join(APP_PATH, ".expo"),
    path.join(APP_PATH, "android"),
    path.join(APP_PATH, "node_modules"),
    path.join(TYPES_PATH, "node_modules"),
    path.join(SERVER_PATH, "node_modules"),
    path.join(SCRIPTS_PATH, "node_modules"),
    path.join(UTILITIES_PATH, "yarn.lock"),
    path.join(UTILITIES_PATH, "node_modules"),
    path.join(UTILITIES_FOR_PC_PATH, "dist"),
    path.join(UTILITIES_FOR_PC_PATH, "build"),
    path.join(UTILITIES_FOR_PC_PATH, "node_modules"),
    path.join(UTILITIES_FOR_PC_PATH, "dist-electron"),
  ];

  Logger.log("Cleaning paths...");
  await Promise.all(
    pathsToClean.map(async (p) => {
      if (!(await fs.promises.stat(p).catch(() => false))) return;

      // eslint-disable-next-line no-console
      console.log(`Removing ${p}`);
      if (!args.ARGS.testing) {
        await fs.promises
          .rm(p, {
            force: true,
            recursive: true,
          })
          .catch((error) => {
            // eslint-disable-next-line no-console
            console.warn(`Failed to remove ${p}, continuing...`, error);
          });
      } else {
        // eslint-disable-next-line no-console
        console.log("Testing mode: Skipping folder removal");
      }
    }),
  );

  // eslint-disable-next-line no-console
  console.log("Cleaning yarn cache in app...");
  try {
    if (!args.ARGS.testing) {
      execSync("yarn cache clean", { cwd: UTILITIES_PATH, stdio: "inherit" });
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

const installAll = () => {
  // eslint-disable-next-line no-console
  console.log(`Installing dependencies in ${UTILITIES_PATH} using yarn...`);

  if (!args.ARGS.testing) {
    execSync("yarn install", {
      cwd: UTILITIES_PATH,
      stdio: "inherit",
    });
  } else {
    // eslint-disable-next-line no-console
    console.log("Testing mode: Skipping yarn install");
  }
};

export const formatAll = async () => {
  await Promise.all(
    Helper.Object.entries(PATHS).map(([name, cwd]) => {
      Logger.log(`Formatting ${name}...`);

      return formatFolder(cwd);
    }),
  );
};

if (process.env.NODE_ENV !== "test") {
  run();
}
