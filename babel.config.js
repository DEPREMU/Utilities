module.exports = function (api) {
  api.cache(true);
  return {
    presets: ["babel-preset-expo"],
    env: {
      production: {
        plugins: ["react-native-paper/babel"],
      },
      prev: {
        plugins: ["react-native-paper/babel"],
      },
      dev: {
        plugins: ["react-native-paper/babel"],
      },
    },
  };
};
