import { execSync } from "child_process";
import { TSX, COMMANDS } from "./commands/commands.ts";

const args = process.argv.slice(2);

const argument: string | undefined = args[0];

if (!argument || !(argument in COMMANDS)) {
  // eslint-disable-next-line no-console
  console.error("Invalid argument provided.", argument);
  process.exit(1);
}

const command = COMMANDS[argument as keyof typeof COMMANDS];

if (!command) {
  // eslint-disable-next-line no-console
  console.error("No command found for the provided argument.", argument);
  process.exit(1);
}

// eslint-disable-next-line no-console
console.log("Executing command:", command);

try {
  execSync(TSX + command, { stdio: "inherit", env: process.env });
} catch {
  // Ignore
}
