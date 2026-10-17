import type { BuildOptions } from "esbuild";

export const options: BuildOptions = {
  bundle: true,
  format: "esm",
  minify: process.env.NODE_ENV === "production",
  platform: "node",
  legalComments: "none",
};

const commonExternal = ["pino", "sharp", "piscina"];

export const externalServer = [
  ...commonExternal,

  "pg",
  "ws",
  "http",
  "https",
  "bullmq",
  "ioredis",
  "firebase-admin",
  "@prisma/client",
  "@node-rs/bcrypt",
  "@prisma/adapter-pg",
  "@whiskeysockets/baileys",
];

export const externalElectron = [
  ...commonExternal,

  "pdfkit",
  "node-7z",
  "7zip-bin",
  "electron",
  "unzipper",
  "bonjour-service",
  "electron-edge-js",
  "@whiskeysockets/baileys",
];

export const externalWorkers = [...commonExternal];
