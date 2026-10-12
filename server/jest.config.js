import { createDefaultPreset } from "ts-jest";

const tsJestTransformCfg = createDefaultPreset().transform;

/** @type {import("jest").Config} **/
export default {
  testEnvironment: "node",
  transform: { ...tsJestTransformCfg },
  moduleNameMapper: {
    "^@/(.*)$": "<rootDir>/$1",
    "^@types$": "<rootDir>/../types/index.d.ts",
    "^@common$": "<rootDir>/../common/serverOrElectron/index.ts",
    "^@REPLACERS$": "<rootDir>/../common/both/REPLACERS/REPLACERS.server.ts",
    "^@commonSrc/(.*)$": "<rootDir>/../common/$1",
    "^chalk$": "<rootDir>/../common/tests/__mocks__/chalk.js",
  },
  globalSetup: "<rootDir>/tests/utils/setup-test.ts",
  testTimeout: 30_000,
  globalTeardown: "<rootDir>/tests/utils/teardown-test.ts",
};
