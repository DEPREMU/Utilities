module.exports = function (api) {
  api.cache(true);
  const platform = process?.env?.PLATFORM;
  const isProduction = process?.env?.NODE_ENV === "production";

  if (!platform) throw new Error("PLATFORM environment variable is not set");

  return {
    presets: ["babel-preset-expo"],
    plugins: [
      "react-native-reanimated/plugin",
      "react-native-paper/babel",
      [
        "module-resolver",
        {
          extensions: [".ts", ".tsx", ".js", ".jsx", ".json"],
          alias: {
            "@": "./",
            "@assets": "./assets",
            "@utils": "./utils/index.ts",
            "@components": "./components",
            "@screens": "./screens",
            "@hooks": "./hooks",
            "@navigation": "./navigation",
            "@context": "./context",
            "@styles": "./styles",
            "@types": "../types/index.d.ts",
            "@common": "../common/both",
          },
        },
      ],
      "babel-plugin-transform-remove-undefined",
      "babel-plugin-minify-guarded-expressions",
      "babel-plugin-minify-dead-code-elimination",
      [
        "babel-plugin-transform-replace-expressions",
        {
          replace: {
            "Platform.OS": JSON.stringify(platform),
            "process.env.NODE_ENV": JSON.stringify(
              process?.env?.NODE_ENV || "production",
            ),
            ...(isProduction
              ? {
                  " log": "(()=>{})",
                  " logWarn": "(()=>{})",
                  " logError": "(()=>{})",
                }
              : {}),
          },
          allowConflictingReplacements: true,
        },
      ],
    ],
  };
};
