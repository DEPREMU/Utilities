import dotenv from "dotenv";
import type { ExpoConfig, ConfigContext } from "expo/config";

dotenv.config({ path: "../.env" });

const version = "1.8.1";

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
    orientation: "default",
    icon: "./assets/icon.png",
    userInterfaceStyle: "automatic",
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
      package: "com.utilities.depremu",
      permissions: [
        "INTERNET",
        "WAKE_LOCK",
        "RECORD_AUDIO",
        "NOTIFICATIONS",
        "POST_NOTIFICATIONS",
        "FOREGROUND_SERVICE",
        "SYSTEM_ALERT_WINDOW",
        "ACCESS_NETWORK_STATE",
        "SCHEDULE_EXACT_ALARM",
        "READ_EXTERNAL_STORAGE",
        "WRITE_EXTERNAL_STORAGE",
        "RECEIVE_BOOT_COMPLETED",
        "ACCESS_BACKGROUND_LOCATION",
        "FOREGROUND_SERVICE_DATA_SYNC",
        "FOREGROUND_SERVICE_MICROPHONE",
        "REQUEST_IGNORE_BATTERY_OPTIMIZATIONS",
      ],
      googleServicesFile: "./google-services.json",
    },
    plugins: [
      "./plugins/handleCreateFiles.js",
      "expo-font",
      "expo-audio",
      "expo-video",
      "expo-camera",
      "expo-secure-store",
      "expo-localization",
      "expo-notifications",
      "react-native-quick-crypto",
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
