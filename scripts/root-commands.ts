import {
  env,
  args,
  APP_PATH,
  TYPES_PATH,
  SERVER_PATH,
  SCRIPTS_PATH,
  UTILITIES_PATH,
  handleExitFromScript,
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

const run = async () => {
  const action = args.ARGS.action;
  if (!action) {
    throw new Error(
      "No action specified. Use --action=<action> or -h for help.",
    );
  }

  Logger.log(`Running root action: ${action}`);

  switch (action) {
    case "compile-check":
      execSync("yarn run app-prebuild-android", {
        cwd: UTILITIES_PATH,
        stdio: "inherit",
        env,
      });
      execSync("cd android && ./gradlew :app:compileDebugKotlin --no-daemon", {
        cwd: APP_PATH,
        stdio: "inherit",
        env,
      });
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
      execSync("yarn expo start -c", { cwd: APP_PATH, stdio: "inherit", env });
      break;
    case "server":
      execSync("yarn run start", {
        cwd: SERVER_PATH,
        stdio: "inherit",
        env: { ...env, SERVER_OR_ELECTRON: "server" },
      });
      break;
    case "server-dev":
      execSync("yarn run start-dev", {
        cwd: SERVER_PATH,
        stdio: "inherit",
        env: { ...env, SERVER_OR_ELECTRON: "server" },
      });
      break;
    case "type-check":
      execSync("yarn run type-check", { cwd: APP_PATH, stdio: "inherit", env });
      break;
    case "before-commit":
      beforeCommit();
      break;
    case "build-web": {
      const envWeb = {
        ...env,
        PLATFORM: "web",
        BUILD_PROFILE: env.BUILD_PROFILE || "production",
      };
      execSync(
        `yarn expo export -c -p web ${envWeb.BUILD_PROFILE === "production" ? "" : "--dev --no-minify"}`,
        {
          env: envWeb,
          cwd: APP_PATH,
          stdio: "inherit",
        },
      );
      break;
    }
    default:
      throw new Error(`Unknown action: ${action}`);
  }
};

const clean = async () => {
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
      await fs.promises
        .rm(p, {
          force: true,
          recursive: true,
        })
        .catch((error) => {
          // eslint-disable-next-line no-console
          console.warn(`Failed to remove ${p}, continuing...`, error);
        });
    }),
  );

  // eslint-disable-next-line no-console
  console.log("Cleaning yarn cache in app...");
  try {
    execSync("yarn cache clean", { cwd: UTILITIES_PATH, stdio: "inherit" });
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

  execSync("yarn install", {
    cwd: UTILITIES_PATH,
    stdio: "inherit",
  });
};

const formatAll = async () => {
  await Promise.all(
    Helper.Object.entries(PATHS).map(([name, cwd]) => {
      Logger.log(`Formatting ${name}...`);

      return formatFolder(cwd);
    }),
  );
};

const beforeCommit = () => {
  handleExitFromScript(() => {});

  Helper.Object.entries(PATHS).forEach(([name, cwd]) => {
    Logger.log(`Running before-commit in ${name}...`);

    execSync("yarn run before-commit", { cwd, stdio: "inherit", env });
  });
};

run();
