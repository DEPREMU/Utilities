import { build } from "esbuild";

build({
  bundle: true,
  minify: true,
  format: "cjs",
  legalComments: "none",
  outfile: "./build/index.cjs",
  platform: "node",
  entryPoints: ["./index.ts"],
}).catch((err) => {
  console.error("Build failed:", err);
  process.exit(1);
});
