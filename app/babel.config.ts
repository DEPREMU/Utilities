import type { REPLACERS_TYPE } from "@types";
import type { ConfigFunction } from "@babel/core";

const config: ConfigFunction = (api) => {
  api.cache.never();

  const platform = process.env?.PLATFORM;
  const BUILD_PROFILE = process.env?.BUILD_PROFILE;

  if (!BUILD_PROFILE)
    throw new Error("BUILD_PROFILE environment variable is not set");
  if (!platform) throw new Error("PLATFORM environment variable is not set");

  const replacers: Record<REPLACERS_TYPE, boolean> = {
    isDev: BUILD_PROFILE === "development",
    isWeb: platform === "web",
    isNative: platform !== "web",
    isPreview: BUILD_PROFILE === "preview",
    isProduction: BUILD_PROFILE === "production",
  };

  const REPLACERS: Record<string, string> = Object.fromEntries(
    Object.entries(replacers).map(([key, value]) => [
      `REPLACERS.${key}`,
      JSON.stringify(value),
    ]),
  );

  const logReplacer = "(()=>{})";
  const logger = {
    log: logReplacer,
    warn: logReplacer,
    error: logReplacer,
  };

  const finalReplacers = {
    ...REPLACERS,
    ...Object.fromEntries(
      Object.entries(logger).map(([key, value]) => {
        const replacerKey = `logger.${key}`;
        if (replacers.isProduction) return [replacerKey, value];
        return [replacerKey, replacerKey];
      }),
    ),
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
            "@components": "./src/components",
            "@navigation": "./src/navigation",
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
      "react-native-reanimated/plugin",
    ],
  };
};

export default config;
