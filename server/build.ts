import { build } from "esbuild";
import { pluginReplace } from "@espcom/esbuild-plugin-replace";

const isProduction = process.env.NODE_ENV === "production";

build({
  bundle: true,
  minify: isProduction,
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
  ...(isProduction
    ? {
        plugins: [
          pluginReplace([
            {
              filter: /\.ts|\.js$/,
              replace: /showInfo\(/g,
              replacer: () => JSON.stringify("(()=> {})("),
            },
          ]),
        ],
      }
    : {}),
}).catch((err) => {
  // eslint-disable-next-line no-console
  console.error("Build failed:", err);
  process.exit(1);
});
