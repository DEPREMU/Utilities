import { REPLACERS_TYPE } from "@types";

export const REPLACERS: REPLACERS_TYPE = {
  isDev:
    process.env.NODE_ENV !== "production" ||
    process.env.BUILD_PROFILE === "development",
  isProduction:
    process.env.NODE_ENV === "production" ||
    process.env.BUILD_PROFILE === "production",

  isWeb: false,
  Logger: null as unknown as REPLACERS_TYPE["Logger"],
  isNative: false,
  isPreview: process.env.BUILD_PROFILE === "preview",
};

// eslint-disable-next-line no-console
console.error("This file should not be used in APP or Server code");
