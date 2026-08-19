import { Helper } from "@commonSrc/both";
import { REPLACERS } from "@commonSrc/both/REPLACERS/REPLACERS.server";
import { REPLACERS_TYPE } from "@types";
import type { BuildOptions } from "esbuild";

export const options: BuildOptions = {
  bundle: true,
  format: "cjs",
  minify: process.env.NODE_ENV === "production",
  platform: "node",
  legalComments: "none",
};

export const external = [
  "pg",
  "ws",
  "fs",
  "path",
  "pino",
  "http",
  "sharp",
  "https",
  "crypto",
  "piscina",
  "firebase-admin",
  "@prisma/client",
  "@node-rs/bcrypt",
  "@prisma/adapter-pg",
];

const REPLACERS_REPLACED: Record<keyof REPLACERS_TYPE, string> = {
  isDev: `${REPLACERS.isDev}`,
  isWeb: `${REPLACERS.isWeb}`,
  Logger: REPLACERS.isProduction ? `(()=>{})` : `REPLACERS.Logger`,
  isLinux: `${REPLACERS.isLinux}`,
  isNative: `${REPLACERS.isNative}`,
  isWindows: `${REPLACERS.isWindows}`,
  isPreview: `${REPLACERS.isPreview}`,
  typeBuild: `"${REPLACERS.typeBuild}"`,
  isProduction: `${REPLACERS.isProduction}`,
};

export const REPLACERS_PLUGIN: Parameters<
  typeof import("@espcom/esbuild-plugin-replace").pluginReplace
>[0] = Helper.Object.entries(REPLACERS_REPLACED).map(([key, value]) => {
  return {
    filter: /\.ts|\.js|\.cjs$/,
    replace: new RegExp(`REPLACERS.${key}`, "g"),
    replacer: () => value,
  };
});
