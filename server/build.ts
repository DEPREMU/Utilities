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
    "http",
    "sharp",
    "https",
    "crypto",
    "firebase-admin",
  ],
}).catch((err) => {
  console.error("Build failed:", err);
  process.exit(1);
});
