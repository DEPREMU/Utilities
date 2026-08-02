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
