import { createDefaultPreset } from "ts-jest";

const tsJestTransformCfg = createDefaultPreset().transform;

/** @type {import("jest").Config} **/
export default {
  testEnvironment: "node",
  transform: {
    ...tsJestTransformCfg,
  },
  moduleNameMapper: {
    "^@types$": "<rootDir>/../types/index.d.ts",
    "^@common$": "<rootDir>/../common/both/index.ts",
    "^@appSrc/(.*)$": "<rootDir>/../app/$1",
    "^@frontendSrc/(.*)$": "<rootDir>/../frontend/$1",
    "^@/(.*)$": "<rootDir>/../frontend/src/$1",
    "^@commonSrc/(.*)$": "<rootDir>/../common/$1",
    "^@utilitiesSrc/(.*)$": "<rootDir>/../UtilitiesForPC/$1",
    "^chalk$": "<rootDir>/tests/__mocks__/chalk.js",
    "^@REPLACERS$": "<rootDir>/../common/both/REPLACERS/REPLACERS.server.ts",
  },
};
