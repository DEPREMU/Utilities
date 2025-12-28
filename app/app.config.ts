import dotenv from "dotenv";
import type { ExpoConfig, ConfigContext } from "expo/config";

dotenv.config({ path: "../.env" });

const version = "1.6.0";

export default ({ config }: ConfigContext): ExpoConfig => {
  return {
    ...config,
    name: "Utilities",
    slug: "Utilities",
    updates: {
      url: "https://u.expo.dev/7dd2c093-0c91-4638-a5b9-828d458e8be0",
    },
    experiments: { baseUrl: "." },
    runtimeVersion: version.split(".").slice(0, 2).join("."),
    version,
    orientation: "portrait",
    icon: "./assets/icon.png",
    userInterfaceStyle: "dark",
    newArchEnabled: true,
    platforms: ["android", "web"],
    extra: {
      version,
      WS_URL_BASE: process.env.WS_URL,
      API_URL_BASE: process.env.API_URL,
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
    android: {
      adaptiveIcon: {
        foregroundImage: "./assets/adaptive-icon.png",
        backgroundColor: "#000000",
      },
      jsEngine: "hermes",
      package: "com.utilities.depremu",
      permissions: [
        "INTERNET",
        "WAKE_LOCK",
        "NOTIFICATIONS",
        "POST_NOTIFICATIONS",
        "FOREGROUND_SERVICE",
        "SYSTEM_ALERT_WINDOW",
        "ACCESS_NETWORK_STATE",
        "READ_EXTERNAL_STORAGE",
        "WRITE_EXTERNAL_STORAGE",
        "RECEIVE_BOOT_COMPLETED",
        "ACCESS_BACKGROUND_LOCATION",
        "FOREGROUND_SERVICE_DATA_SYNC",
        "REQUEST_IGNORE_BATTERY_OPTIMIZATIONS",
      ],
      googleServicesFile: "./google-services.json",
    },
    plugins: [
      "./plugins/handleCreateFiles.js",
      "expo-font",
      "expo-camera",
      "expo-secure-store",
      "expo-localization",
      "expo-notifications",
      [
        "react-native-permissions",
        {
          iosPermissions: [],
        },
      ],
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
  };
};
