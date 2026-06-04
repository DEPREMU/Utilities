import { build, type Plugin } from "esbuild";
import { pluginReplace } from "@espcom/esbuild-plugin-replace";

const isProduction = process.env.NODE_ENV === "production";

const REPLACERS = {
  isDev: !isProduction,
};
let i = 0;
const plugins: Plugin[] = [
  pluginReplace([
    {
      filter: /\.ts|\.js$/,
      replace: /Logger\.[a-zA-Z0-9_]+\(/g,
      replacer: () => "(()=> {})(",
    },
    {
      filter: /\.ts|\.js$/,
      replace: /process\.env\.NODE_ENV/g,
      replacer: () => JSON.stringify(process.env.NODE_ENV ?? "production"),
    },
    {
      filter: /\.ts|\.js$/,
      replace: /getEnvValue\("__DEV__"\)/g,
      replacer: () => `${REPLACERS.isDev}`,
    },
    {
      filter: /\.ts|\.js$/,
      replace: /REPLACERS\.([a-zA-Z0-9_]+)/,
      replacer: () => {
        return (_, p1: string) => {
          if (p1 in REPLACERS) {
            return `${REPLACERS[p1 as keyof typeof REPLACERS]}`;
          } else throw new Error(`Unknown replacer: ${p1}`);
        };
      },
    },
  ]),
];

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
    "piscina",
    "firebase-admin",
  ],
  plugins,
}).catch((err) => {
  // eslint-disable-next-line no-console
  console.error("Build failed:", err);
  process.exit(1);
});
