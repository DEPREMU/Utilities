import { REPLACERS_TYPE } from "@types";

/**
 * @description
 * This file will be processed by esbuild and the values will be replaced by the values of the environment variables.
 * This variable is only used on dev mode, when production is set to true, this variable will not be used, and .
 */
export const REPLACERS: REPLACERS_TYPE = {
  //? Changing value on logger.ts
  Logger: null as unknown as REPLACERS_TYPE["Logger"],

  isDev:
    process.env.NODE_ENV === "test" ||
    process.env.NODE_ENV === undefined ||
    process.env.NODE_ENV === "development",
  isPreview: false,
  isProduction: process.env.NODE_ENV === "production",

  isWeb: false,
  isNative: false,

  typeBuild: "normal",

  isLinux: process.platform === "linux",
  isWindows: process.platform === "win32",
};
