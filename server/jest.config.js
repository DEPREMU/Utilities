import { createDefaultPreset } from "ts-jest";

const tsJestTransformCfg = createDefaultPreset().transform;

/** @type {import("jest").Config} **/
export default {
  testEnvironment: "node",
  transform: { ...tsJestTransformCfg },
  moduleNameMapper: {
    "^@types$": "<rootDir>/../types/index.d.ts",
    "^@common$": "<rootDir>/../common/both/index.ts",
    "^@commonSrc/(.*)$": "<rootDir>/../common/$1",
  },
  globalSetup: "<rootDir>/tests/utils/setup-test.ts",
  testTimeout: 30_000,
  globalTeardown: "<rootDir>/tests/utils/teardown-test.ts",
};
