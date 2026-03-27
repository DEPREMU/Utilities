import dotenv from "dotenv";
import type { ExpoConfig, ConfigContext } from "expo/config";

dotenv.config({ path: "../.env" });

export default (
  { config }: ConfigContext,
  BUILD_PROFILE?: string,
): ExpoConfig => {
  if (!BUILD_PROFILE) BUILD_PROFILE = process.env.BUILD_PROFILE;

  if (!BUILD_PROFILE)
    throw new Error("BUILD_PROFILE environment variable is not set");

  const isProduction = BUILD_PROFILE === "production";

  const name = "Utilities" + (isProduction ? "" : ` (${BUILD_PROFILE})`);
  const version = "0.1.3-beta" + (isProduction ? "" : `-${BUILD_PROFILE}`);

  return {
    ...config,
    name,
    slug: "Utilities",
    updates: {
      url: "https://u.expo.dev/7dd2c093-0c91-4638-a5b9-828d458e8be0",
    },
    experiments: { baseUrl: "." },
    runtimeVersion: isProduction
      ? version.split(".").slice(0, 2).join(".")
      : BUILD_PROFILE + "-0.0.0",
    version,
    orientation: "portrait",
    icon: "./src/assets/icon.png",
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
      image: "./src/assets/icon.png",
      resizeMode: "contain",
      backgroundColor: "#ffffff",
    },
    android: {
      adaptiveIcon: {
        foregroundImage: "./src/assets/adaptive-icon.png",
        backgroundColor: "#000000",
      },
      package:
        "com.utilities.depremu" + (isProduction ? "" : `.${BUILD_PROFILE}`),
      permissions: [
        "CAMERA",
        "INTERNET",
        "WAKE_LOCK",
        "RECORD_AUDIO",
        "NOTIFICATIONS",
        "ACCESS_WIFI_STATE",
        "POST_NOTIFICATIONS",
        "FOREGROUND_SERVICE",
        "NEARBY_WIFI_DEVICES",
        "SYSTEM_ALERT_WINDOW",
        "ACCESS_NETWORK_STATE",
        "SCHEDULE_EXACT_ALARM",
        "READ_EXTERNAL_STORAGE",
        "WRITE_EXTERNAL_STORAGE",
        "RECEIVE_BOOT_COMPLETED",
        "ACCESS_BACKGROUND_LOCATION",
        "ACCESS_NOTIFICATION_POLICY",
        "CHANGE_WIFI_MULTICAST_STATE",
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
      "expo-sharing",
      "expo-system-ui",
      "expo-file-system",
      "expo-secure-store",
      "expo-media-library",
      "expo-notifications",
      "expo-document-picker",
      "expo-local-authentication",
      "react-native-quick-crypto",
      ["expo-sqlite", { enableFTS: true, useSQLCipher: true }],
      ["expo-location", { isAndroidBackgroundLocationEnabled: true }],
      [
        "expo-build-properties",
        {
          enableMinifyInReleaseBuilds: true,
          android: { usesCleartextTraffic: true, minSdkVersion: 29 },
        },
      ],
      [
        "expo-localization",
        { supportedLocales: { web: ["en", "es"], android: ["en", "es"] } },
      ],
      [
        "react-native-audio-api",
        {
          androidFSTypes: ["microphone", "mediaPlayback"],
          androidPermissions: [],
          androidForegroundService: true,
        },
      ],
    ],
    web: { favicon: "./src/assets/favicon.png" },
  };
};
