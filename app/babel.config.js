module.exports = function (api) {
  api.cache(true);
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
      "react-native-reanimated/plugin",
    ],
  };
};
