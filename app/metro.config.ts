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

//? expo-sqlite
// config.resolver.assetExts.push("wasm");
// config.server.enhanceMiddleware = (middleware: any) => {
//   return (_0: any, res: any, _1: any) => {
//     res.setHeader("Cross-Origin-Embedder-Policy", "credentialless");
//     res.setHeader("Cross-Origin-Opener-Policy", "same-origin");
//     middleware(_0, res, _1);
//   };
// };

export default config;
