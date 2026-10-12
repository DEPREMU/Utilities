import type { ConfigFunction } from "@babel/core";
import type { REPLACERS_TYPE, Paths, Logger } from "@types";

const config: ConfigFunction = (api) => {
  api.cache.never();

  const platform = process.env?.PLATFORM;
  const BUILD_PROFILE = process.env?.BUILD_PROFILE;

  if (!BUILD_PROFILE)
    throw new Error("BUILD_PROFILE environment variable is not set");
  if (!platform) throw new Error("PLATFORM environment variable is not set");

  const replacers: Record<Paths<REPLACERS_TYPE>, string> = {
    isDev: `${BUILD_PROFILE === "development"}`,
    isWeb: `${platform === "web"}`,
    isLinux: "false",
    isNative: `${platform !== "web"}`,
    isServer: "false",
    isWindows: `false`,
    typeBuild: `"normal"`,
    isPreview: `${BUILD_PROFILE === "preview"}`,
    isProduction: `${BUILD_PROFILE === "production"}`,
  };

  const REPLACERS: Record<string, string> = Object.fromEntries(
    Object.entries(replacers)
      .filter(([, value]) => value !== "")
      .map(([key, value]) => [`REPLACERS.${key}`, value]),
  );

  const logger: Record<Paths<Logger>, string> = {
    log: "(()=>void 0)",
    warn: "(()=>void 0)",
    error: "(()=>void 0)",
    secret: "(()=>void 0)",
  };

  const LOGGER_REPLACERS = Object.fromEntries(
    Object.entries(logger).map(([key, value]) => [`logger.${key}`, value]),
  );

  const finalReplacers: Record<string, string> = {
    "Platform.OS": JSON.stringify(platform),
    "process.env.BUILD_PROFILE": JSON.stringify(BUILD_PROFILE),
  };

  Object.assign(finalReplacers, REPLACERS);

  const prodPlugins: string[] = [];

  if (process.env.BUILD_PROFILE === "production") {
    Object.assign(finalReplacers, LOGGER_REPLACERS);
    prodPlugins.push(
      "./plugins/removeLoggerInstance.js",
      "babel-plugin-transform-remove-console",
    );
  }

  return {
    presets: ["babel-preset-expo"],
    plugins: [
      [
        "module-resolver",
        {
          extensions: [".ts", ".tsx", ".json"],
          alias: {
            "@": "./src",
            "@refs": "./src/app/refs",
            "@utils": "./src/utils",
            "@hooks": "./src/hooks",
            "@types": "../types/index.d.ts",
            "@assets": "./src/assets",
            "@styles": "./src/styles",
            "@common": "../common/both",
            "@context": "./src/context",
            "@screens": "./src/features",
            "@modules": "./src/utils/modules",
            "@commonSrc": "../common",
            "@REPLACERS": "../common/both/REPLACERS/REPLACERS.expo.ts",
            "@navigation": "./src/navigation",
            "@components": "./src/common/components",
          },
        },
      ],
      ...prodPlugins,
      [
        "babel-plugin-transform-replace-expressions",
        {
          replace: finalReplacers,
          allowConflictingReplacements: true,
        },
      ],
      "babel-plugin-minify-constant-folding",
      "babel-plugin-transform-remove-undefined",
      "babel-plugin-minify-guarded-expressions",
      "babel-plugin-minify-dead-code-elimination",
      "@babel/plugin-transform-export-namespace-from",
      "react-native-reanimated/plugin",
    ],
  };
};

export default config;
