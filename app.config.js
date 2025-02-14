import "dotenv/config";

const apiGoogleMaps = process.env.API_GOOGLE_MAPS || "";

export default {
  expo: {
    name: "Utilities",
    slug: "Utilities",
    version: "1.0.0",
    owner: "depremu",
    orientation: "portrait",
    icon: "./assets/icon.png",
    userInterfaceStyle: "light",
    newArchEnabled: true,
    splash: {
      image: "./assets/splash-icon.png",
      resizeMode: "contain",
      backgroundColor: "#ffffff",
    },
    ios: {
      supportsTablet: true,
    },
    android: {
      package: "com.depremu.utilities",
      newArchEnabled: true,
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
        projectId: "7dd2c093-0c91-4638-a5b9-828d458e8be0",
      },
      SUPABASE_URL: process.env.SUPABASE_URL,
      SUPABASE_KEY: process.env.SUPABASE_KEY,
      SECRET_KEY_TO_ENCRYPT: process.env.SECRET_KEY_TO_ENCRYPT,
    },
    plugins: [
      "expo-secure-store",
      [
        "expo-build-properties",
        {
          android: {
            usesCleartextTraffic: true,
          },
        },
      ],
    ],
  },
};
