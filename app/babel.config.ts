import type { REPLACERS_TYPE, Paths } from "@types";
import type { ConfigFunction } from "@babel/core";

const config: ConfigFunction = (api) => {
  api.cache.never();

  const platform = process.env?.PLATFORM;
  const BUILD_PROFILE = process.env?.BUILD_PROFILE;

  if (!BUILD_PROFILE)
    throw new Error("BUILD_PROFILE environment variable is not set");
  if (!platform) throw new Error("PLATFORM environment variable is not set");

  const replacers: Record<Exclude<Paths<REPLACERS_TYPE>, "Logger">, string> = {
    isDev: `${BUILD_PROFILE === "development"}`,
    isWeb: `${platform === "web"}`,
    isNative: `${platform !== "web"}`,
    isPreview: `${BUILD_PROFILE === "preview"}`,
    isProduction: `${BUILD_PROFILE === "production"}`,
    "Logger.log": BUILD_PROFILE === "production" ? "(()=>{})" : "",
    "Logger.warn": BUILD_PROFILE === "production" ? "(()=>{})" : "",
    "Logger.error": BUILD_PROFILE === "production" ? "(()=>{})" : "",
  };

  const REPLACERS: Record<string, string> = Object.fromEntries(
    Object.entries(replacers)
      .filter(([, value]) => value !== "")
      .map(([key, value]) => [`REPLACERS.${key}`, value]),
  );

  const finalReplacers = {
    ...REPLACERS,
    "Platform.OS": JSON.stringify(platform),
    "process.env.BUILD_PROFILE": JSON.stringify(BUILD_PROFILE),
  };

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
            "@navigation": "./src/navigation",
            "@components": "./src/common/components",
          },
        },
      ],
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
