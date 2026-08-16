import fs from "fs";
import path from "path";

const scriptsPath = path.resolve("scripts");
const tsxPath = path.resolve(scriptsPath, "tsconfig.json");
if (!fs.existsSync(tsxPath)) throw new Error(`File does not exist: ${tsxPath}`);

export const TSX = `tsx --tsconfig ${tsxPath} ` as const;

export const COMMANDS = {
  //? Root commands
  clean: "scripts/root-commands.ts --action=clean",
  "clean:all": "scripts/root-commands.ts --action=clean-all",
  "format-all": "scripts/root-commands.ts --action=format-all",
  app: "scripts/root-commands.ts --action=app",
  "type-check": "scripts/root-commands.ts --action=type-check",
  "build-web": "scripts/root-commands.ts --action=build-web",
  "app-compile-check": "scripts/root-commands.ts --action=compile-check",

  //? App
  "app-prebuild-android": "scripts/app/app-prebuild.ts",
  "app-build-dev-android": "scripts/app/app-build-dev-android.ts",

  //? Utilities for PC
  "build-app-electron": "scripts/UtilitiesForPC/build-app-electron.ts",
  "build-web-app-electron": "scripts/UtilitiesForPC/build-web-app-electron.ts",
  "build-resources-electron":
    "scripts/UtilitiesForPC/build-resources-electron.ts",
  "start-electron": "scripts/UtilitiesForPC/start-electron.ts",

  //? Other commands
  "update-assets": "scripts/update.ts",
  "build-android": "scripts/app/build-android.ts",
  "build-upload-electron": "scripts/UtilitiesForPC/build-upload-electron.ts",
  "build-upload-android": "scripts/app/build-upload-android.ts",
  "build-autocomplete-dict": "scripts/app/build-autocomplete-dict.ts",
} as const;
