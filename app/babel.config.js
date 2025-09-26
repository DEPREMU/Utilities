module.exports = function (api) {
  api.cache(true);
  const platform = process?.env?.PLATFORM;

  if (!platform) {
    throw new Error("PLATFORM environment variable is not set");
  }

  return {
    presets: ["babel-preset-expo"],
    plugins: [
      [
        "module-resolver",
        {
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
            "@types": "../types/index.ts",
          },
        },
      ],
      "react-native-worklets/plugin",
      [
        "babel-plugin-transform-replace-expressions",
        {
          replace: {
            "Platform.OS": platform,
            "process.env.NODE_ENV": process?.env?.NODE_ENV || "production",
          },
          allowConflictingReplacements: true,
        },
      ],
    ],
  };
};
