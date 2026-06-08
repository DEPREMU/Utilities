import fs from "fs";
import path from "path";
import { pluginReplace } from "@espcom/esbuild-plugin-replace";
import { build, type BuildOptions, type Plugin } from "esbuild";

const UTILITIES_PATH = path.resolve("..");
if (!UTILITIES_PATH.endsWith("Utilities"))
  throw new Error(`Unexpected utilities path: ${UTILITIES_PATH}`);
const SERVER_PATH = path.resolve(UTILITIES_PATH, "server");

const isProduction = process.env.NODE_ENV === "production";

const REPLACERS = {
  isDev: !isProduction,
};

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

const options: BuildOptions = {
  bundle: true,
  format: "cjs",
  minify: isProduction,
  platform: "node",
  legalComments: "none",
};

const external = [
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
  "@prisma/adapter-pg",
];

build({
  ...options,
  outfile: path.join(SERVER_PATH, "build", "index.cjs"),
  entryPoints: [path.join(SERVER_PATH, "index.ts")],
  external,
  plugins: REPLACERS.isDev ? [] : plugins,
}).catch((err) => {
  // eslint-disable-next-line no-console
  console.error("Build failed:", err);
  process.exit(1);
});

const piscinaWorkerPath = path.join(
  UTILITIES_PATH,
  "common",
  "serverOrElectron",
  "piscina",
);

fs.readdir(piscinaWorkerPath, async (err, files) => {
  if (err) {
    // eslint-disable-next-line no-console
    console.error("Error reading workers directory:", err);
    process.exit(1);
  }

  await Promise.all(
    files.map((file) => {
      if (!file.endsWith("worker.ts")) return;

      return build({
        ...options,
        outfile: path.join(
          SERVER_PATH,
          "build",
          "piscina",
          file.replace(".ts", ".cjs"),
        ),
        external,
        entryPoints: [path.join(piscinaWorkerPath, file)],
      });
    }),
  );
});
