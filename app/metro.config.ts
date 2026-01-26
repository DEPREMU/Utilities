import path from "path";
import { getDefaultConfig } from "expo/metro-config.js";

const projectRoot = path.resolve();
const workspaceRoot = path.resolve(projectRoot, "..");

const config = getDefaultConfig(projectRoot);

// Monorepo/workspaces: dependencies can be hoisted to the workspace root.
config.watchFolders = [workspaceRoot];
config.resolver.nodeModulesPaths = [
  path.resolve(projectRoot, "node_modules"),
  path.resolve(workspaceRoot, "node_modules"),
];

export default config;
