import { createDefaultPreset } from "ts-jest";

const tsJestTransformCfg = createDefaultPreset().transform;

/** @type {import("jest").Config} **/
export default {
  testEnvironment: "node",
  transform: {
    ...tsJestTransformCfg,
  },
  moduleNameMapper: {
    "^chalk$": "<rootDir>/tests/__mocks__/chalk.js",
    "^@commonSrc/(.*)$": "<rootDir>/$1",
    "^@REPLACERS$": "<rootDir>/both/REPLACERS/REPLACERS",
    "^@types$": "<rootDir>/../types/index.d.ts",
  },
};
