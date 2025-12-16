const path = require("path");
const { getDefaultConfig } = require("expo/metro-config");

const projectRoot = __dirname;

const workspaceRoot = path.resolve(projectRoot, "..");

const config = getDefaultConfig(projectRoot);

config.watchFolders = [workspaceRoot];

config.resolver.unstable_enableSymlinks = true;
config.resolver.unstable_enablePackageExports = true;

config.resolver.sourceExts = ["ts", "tsx", "js", "jsx", "json"];

module.exports = config;
