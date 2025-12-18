import { execSync } from "child_process";
import { ARGS, env, getArgs } from "../config.ts";

/**
 * Executes a shell command with enhanced environment for Electron compatibility
 * @param command - The shell command to execute
 */
const runCommand = (command: string): void => {
  try {
    console.log(`Executing: ${command}`);
    execSync(command, {
      env,
      stdio: "inherit",
    });
  } catch (error) {
    console.error("Command failed:", error);
    process.exit(1);
  }
};

ARGS.profile = "development";
const args = getArgs();

runCommand(`yarn run build-web-app-electron ${args}`);

runCommand(`yarn run build-resources-electron ${args}`);

runCommand(
  "cd UtilitiesForPC && npx electron . --expose-gc --no-sandbox --ozone-platform=x11 "
);
