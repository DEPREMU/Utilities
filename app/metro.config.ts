/* eslint-disable @typescript-eslint/no-explicit-any */
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
config.resolver.assetExts.push("wasm");
// @ts-expect-error - enhanceMiddleware is deprecated and is read-only, but expo-sqlite relies on it to set COEP/COOP headers for WebAssembly support. See https://docs.expo.dev/versions/latest/sdk/sqlite/#web-setup for more details.
config.server.enhanceMiddleware = (middleware: (...args) => void) => {
  return (_0: never, res: any, _1: never) => {
    res.setHeader("Cross-Origin-Embedder-Policy", "credentialless");
    res.setHeader("Cross-Origin-Opener-Policy", "same-origin");
    middleware(_0, res, _1);
  };
};

(config.resolver.resolveRequest as typeof config.resolver.resolveRequest) = (
  context,
  moduleName,
  platform,
  ...args
) => { 
  if (moduleName.endsWith("/REPLACERS"))
    return context.resolveRequest(
      context,
      moduleName + ".expo",
      platform,
      ...args,
    );

  return context.resolveRequest(context, moduleName, platform, ...args);
};

export default config;
