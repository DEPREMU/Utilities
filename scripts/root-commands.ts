import { execSync } from "child_process";
import {
  env,
  ARGS,
  APP_PATH,
  TYPES_PATH,
  SERVER_PATH,
  SCRIPTS_PATH,
  UTILITIES_PATH,
  UTILITIES_FOR_PC_PATH,
} from "./config.ts";
import fs from "fs";
import path from "path";
import { formatFolder } from "./format-folder.ts";

const run = () => {
  const action = ARGS.action;
  if (!action) {
    throw new Error(
      "No action specified. Use --action=<action> or -h for help."
    );
  }

  console.log(`Running root action: ${action}`);

  switch (action) {
    case "clean":
      clean();
      break;
    case "clean-all":
      clean();
      installAll();
      break;
    case "format-all":
      formatAll();
      break;
    case "install-all":
      installAll();
      break;
    case "app":
      execSync("npx expo start -c", { cwd: APP_PATH, stdio: "inherit", env });
      break;
    case "server":
      execSync("npm run start", { cwd: SERVER_PATH, stdio: "inherit", env });
      break;
    case "server-dev":
      execSync("npm run start-dev", {
        cwd: SERVER_PATH,
        stdio: "inherit",
        env,
      });
      break;
    case "type-check":
      execSync("npm run type-check", { cwd: APP_PATH, stdio: "inherit", env });
      break;
    case "i-a":
      execSync("npm install", { cwd: APP_PATH, stdio: "inherit", env });
      break;
    case "i-s":
      execSync("npm install", { cwd: SERVER_PATH, stdio: "inherit", env });
      break;
    case "before-commit":
      beforeCommit();
      break;
    case "build-web": {
      const envWeb = {
        ...env,
        PLATFORM: "web",
        NODE_ENV: env.BUILD_PROFILE || "production",
      };
      execSync("npx expo export -c -p web", {
        cwd: APP_PATH,
        stdio: "inherit",
        env: envWeb,
      });
      break;
    }
    default:
      throw new Error(`Unknown action: ${action}`);
  }
};

const clean = () => {
  const pathsToClean = [
    path.join(APP_PATH, ".expo"),
    path.join(APP_PATH, "node_modules"),
    path.join(APP_PATH, "package-lock.json"),
    path.join(TYPES_PATH, "node_modules"),
    path.join(TYPES_PATH, "package-lock.json"),
    path.join(SERVER_PATH, "node_modules"),
    path.join(SERVER_PATH, "package-lock.json"),
    path.join(SCRIPTS_PATH, "node_modules"),
    path.join(SCRIPTS_PATH, "package-lock.json"),
    path.join(UTILITIES_PATH, "node_modules"),
    path.join(UTILITIES_FOR_PC_PATH, "dist"),
    path.join(UTILITIES_FOR_PC_PATH, "build"),
    path.join(UTILITIES_FOR_PC_PATH, "node_modules"),
    path.join(UTILITIES_FOR_PC_PATH, "dist-electron"),
    path.join(UTILITIES_FOR_PC_PATH, "package-lock.json"),
  ];

  console.log("Cleaning paths...");
  pathsToClean.forEach((p) => {
    if (!fs.existsSync(p)) return;

    console.log(`Removing ${p}`);
    try {
      fs.rmSync(p, { recursive: true, force: true });
    } catch (error) {
      console.warn(`Failed to remove ${p}, continuing...`);
    }
  });

  console.log("Cleaning npm cache in app...");
  try {
    execSync("npm cache clean --force", { cwd: APP_PATH, stdio: "inherit" });
  } catch (e) {
    console.warn(
      "Failed to clean npm cache in app, continuing...",
      e instanceof Error ? e.message : e
    );
  }
};

const installAll = () => {
  const dirs = [
    APP_PATH,
    TYPES_PATH,
    SERVER_PATH,
    SCRIPTS_PATH,
    UTILITIES_FOR_PC_PATH,
  ];
  dirs.forEach((dir) => {
    console.log(`Installing dependencies in ${dir}...`);
    try {
      execSync("npm i", { cwd: dir, stdio: "inherit", env });
    } catch (error) {
      console.warn(`Failed to install dependencies in ${dir}, continuing...`);
    }
  });
};

const formatAll = () => {
  console.log("Formatting app...");
  formatFolder(APP_PATH);
  console.log("Formatting server...");
  formatFolder(SERVER_PATH);
  console.log("Formatting UtilitiesForPC...");
  formatFolder(UTILITIES_FOR_PC_PATH);
  console.log("Formatting types...");
  formatFolder(TYPES_PATH);
  console.log("Formatting scripts...");
  formatFolder(SCRIPTS_PATH);
};

const beforeCommit = () => {
  console.log("Running before-commit in app...");
  execSync("npm run before-commit", { cwd: APP_PATH, stdio: "inherit", env });

  console.log("Running before-commit in server...");
  execSync("npm run before-commit", {
    cwd: SERVER_PATH,
    stdio: "inherit",
    env,
  });

  console.log("Running before-commit in UtilitiesForPC...");
  execSync("npm run before-commit", {
    cwd: UTILITIES_FOR_PC_PATH,
    stdio: "inherit",
    env,
  });

  console.log("Running type-check in scripts...");
  execSync("npm run type-check", { cwd: SCRIPTS_PATH, stdio: "inherit", env });
};

run();
