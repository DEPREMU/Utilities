import "dotenv/config";

const apiGoogleMaps = process.env.API_GOOGLE_MAPS;

const config = {
  name: "Utilities",
  slug: "utilities",
  version: "1.1.0",
  orientation: "portrait",
  icon: "./assets/icon.png",
  userInterfaceStyle: "light",
  notification: {
    icon: "./assets/icon.png",
    color: "#000000",
  },
  splash: {
    image: "./assets/splash.png",
    resizeMode: "contain",
    backgroundColor: "#ffffff",
  },
  ios: {
    supportsTablet: true,
  },
  android: {
    package: "com.depremu.utilities",
    adaptiveIcon: {
      foregroundImage: "./assets/adaptive-icon.png",
      backgroundColor: "#ffffff",
    },
    versionCode: 1,
    permissions: [
      "INTERNET",
      "ACCESS_NETWORK_STATE",
      "NOTIFICATIONS",
      "READ_EXTERNAL_STORAGE",
      "WRITE_EXTERNAL_STORAGE",
      "FOREGROUND_SERVICE",
    ],
    config: {
      googleMaps: {
        apiKey: apiGoogleMaps,
      },
    },
  },
  web: {
    favicon: "./assets/favicon.png",
  },
  extra: {
    eas: {
      projectId: "805ecce3-6c26-43e4-a556-a949fb62c2d8",
    },
    SUPABASE_URL: process.env.SUPABASE_URL,
    SUPABASE_KEY: process.env.SUPABASE_KEY,
    SECRET_KEY_TO_ENCRYPT: process.env.SECRET_KEY_TO_ENCRYPT,
  },
  plugins: ["expo-secure-store", "expo-localization"],
};

export default config;
