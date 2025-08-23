import dotenv from "dotenv";

dotenv.config({ path: "../.env" });

export default {
  expo: {
    name: "Utilities",
    slug: "Utilities",
    version: "1.0.0",
    orientation: "portrait",
    icon: "./assets/icon.png",
    userInterfaceStyle: "light",
    newArchEnabled: true,
    platforms: ["ios", "android", "web"],
    extra: {
      SUPABASE_URL: process.env.SUPABASE_URL,
      SUPABASE_KEY: process.env.SUPABASE_KEY,
      ADMIN_PASSWORD: process.env.ADMIN_PASSWORD,
      eas: {
        projectId: "7dd2c093-0c91-4638-a5b9-828d458e8be0",
      },
    },
    splash: {
      image: "./assets/icon.png",
      resizeMode: "contain",
      backgroundColor: "#ffffff",
    },
    ios: {
      supportsTablet: true,
    },
    android: {
      adaptiveIcon: {
        foregroundImage: "./assets/adaptive-icon.png",
        backgroundColor: "#000000",
      },
      jsEngine: "hermes",
      package: "com.utilities.depremu",
      permissions: [
        "INTERNET",
        "ACCESS_NETWORK_STATE",
        "NOTIFICATIONS",
        "READ_EXTERNAL_STORAGE",
        "WRITE_EXTERNAL_STORAGE",
        "FOREGROUND_SERVICE",
      ],
    },
    plugins: [
      "expo-font",
      "expo-secure-store",
      "expo-localization",
      [
        "expo-build-properties",
        {
          android: {
            usesCleartextTraffic: true,
          },
        },
      ],
    ],
    web: {
      favicon: "./assets/favicon.png",
    },
  },
};
