import { Platform } from "react-native";
import { REPLACERS_TYPE } from "@types";

/**
 * @description
 * This file will be processed by esbuild and the values will be replaced by the values of the environment variables.
 * This variable is only used on dev mode, when production is set to true, this variable will not be used, and .
 */
export const REPLACERS: REPLACERS_TYPE = {
  isDev: process.env.BUILD_PROFILE === "development",
  isPreview: process.env.BUILD_PROFILE === "preview",
  isProduction: process.env.BUILD_PROFILE === "production",

  isWeb: Platform.OS === "web",
  isNative: Platform.OS !== "web",

  Logger: null as unknown as REPLACERS_TYPE["Logger"],
  isLinux: false,
  isWindows: false,
  typeBuild: (process.env.TYPE_BUILD as "normal") ?? "normal",
};
