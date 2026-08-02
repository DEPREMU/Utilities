import fs from "fs";
import path from "path";
import { Helper } from "@commonSrc/both/helpers";
import { REPLACERS } from "@commonSrc/both/REPLACERS/REPLACERS.server";
import { pluginReplace } from "@espcom/esbuild-plugin-replace";
import { REPLACERS_TYPE } from "@types";
import { options, external } from "@commonSrc/serverOrElectron/build";
import { build, type Plugin } from "esbuild";

const UTILITIES_PATH = path.resolve("..");
if (!UTILITIES_PATH.endsWith("Utilities"))
  throw new Error(`Unexpected utilities path: ${UTILITIES_PATH}`);
const SERVER_PATH = path.resolve(UTILITIES_PATH, "server");

const REPLACERS_REPLACED: Record<keyof REPLACERS_TYPE, string> = {
  isDev: `${REPLACERS.isDev}`,
  isWeb: `${REPLACERS.isWeb}`,
  Logger: REPLACERS.isProduction ? `(()=>{})` : `REPLACERS.Logger`,
  isNative: `${REPLACERS.isNative}`,
  isPreview: `${REPLACERS.isPreview}`,
  isProduction: `${REPLACERS.isProduction}`,
};

const REPLACERS_PLUGIN = Helper.Object.entries(REPLACERS_REPLACED).map(
  ([key, value]) => {
    return {
      filter: /\.ts|\.js|\.cjs$/,
      replace: new RegExp(`REPLACERS.${key}`, "g"),
      replacer: () => value,
    };
  },
);

const plugins: Plugin[] = [
  {
    name: "platform",
    setup: (build) => {
      build.onResolve({ filter: /.\/REPLACERS$/ }, () => ({
        path: path.join(
          UTILITIES_PATH,
          "common/both/REPLACERS/REPLACERS.server.ts",
        ),
      }));
    },
  },
  pluginReplace([...REPLACERS_PLUGIN]),
];

build({
  ...options,
  plugins,
  external,

  outfile: path.join(SERVER_PATH, "build", "index.cjs"),
  entryPoints: [path.join(SERVER_PATH, "index.ts")],
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
  if (err) throw new Error(`Error reading workers directory: ${err.message}`);

  await Promise.all(
    files.map((file) => {
      if (!file.endsWith("worker.ts")) return;

      return build({
        ...options,
        plugins,
        external,

        outfile: path.join(
          SERVER_PATH,
          "build",
          "piscina",
          file.replace(".ts", ".cjs"),
        ),
        entryPoints: [path.join(piscinaWorkerPath, file)],
      });
    }),
  );
});
