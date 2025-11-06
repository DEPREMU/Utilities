import os from "os";
import { build } from "esbuild";
import { pluginReplace } from "@espcom/esbuild-plugin-replace";
import type { BuildOptions } from "esbuild";

const isWindows = os.platform() === "win32";

const baseConfig: BuildOptions = {
  bundle: true,
  minify: true,
  format: "cjs",
  legalComments: "none",
};

build({
  ...baseConfig,
  outfile: "./build/preload.js",
  platform: "browser",
  external: ["electron"],
  entryPoints: ["./src/preload.ts"],
}).catch((err) => {
  console.error("Preload build failed", err);
  process.exit(1);
});

build({
  ...baseConfig,
  outfile: "./build/index.cjs",
  platform: "node",
  external: ["electron", "keytar"],
  entryPoints: ["./src/main/index.ts"],
  plugins: [
    pluginReplace([
      {
        filter: /\.ts|\.js$/,
        replace: /[a-zA-Z_]+\.getValue\([\n\s]*"isWindows"[\n\s]*\)/g,
        replacer: () => JSON.stringify(isWindows),
      },
    ]),
  ],
}).catch((err) => {
  console.error("Build failed:", err);
  process.exit(1);
});
