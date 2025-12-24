import { build } from "esbuild";

build({
  bundle: true,
  minify: true,
  format: "cjs",
  outfile: "./build/index.cjs",
  platform: "node",
  entryPoints: ["./index.ts"],
  legalComments: "none",
  external: [
    "pg",
    "ws",
    "fs",
    "path",
    "pino",
    "http",
    "sharp",
    "https",
    "crypto",
    "firebase-admin",
  ],
}).catch((err) => {
  // eslint-disable-next-line no-console
  console.error("Build failed:", err);
  process.exit(1);
});
