import {
  describe,
  it,
  expect,
  beforeEach,
  afterAll,
  jest,
} from "@jest/globals";
import { args } from "../arguments.ts";
import * as rootCommands from "../root-commands.ts";
import child_process from "child_process";
import fs from "fs";
import { Logger } from "@commonSrc/serverOrElectron/logger.ts";

jest.mock("child_process", () => ({
  execSync: jest.fn(),
}));

jest.mock("fs", () => ({
  ...(jest.requireActual("fs") as Record<string, unknown>),
  promises: {
    rm: jest.fn<() => Promise<void>>().mockResolvedValue(undefined),
    stat: jest.fn<() => Promise<Partial<fs.Stats>>>().mockResolvedValue({}),
  },
}));

jest.mock("@commonSrc/serverOrElectron/logger.ts", () => ({
  Logger: {
    log: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
  },
}));

jest.mock("prettier", () => ({
  format: jest.fn<() => Promise<string>>().mockResolvedValue(""),
}));

describe("root-commands", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  afterAll(() => {
    jest.restoreAllMocks();
  });

  it("should execute compile-check command in normal mode", async () => {
    args.editArg("testing", false);
    args.editArg("action", "compile-check");
    await rootCommands.run();
    expect(child_process.execSync).toHaveBeenCalledWith(
      expect.stringContaining("yarn run app-prebuild-android"),
      expect.anything(),
    );
  });

  it("should skip compile-check execution in testing mode", async () => {
    args.editArg("testing", true);
    args.editArg("action", "compile-check");
    await rootCommands.run();
    expect(child_process.execSync).not.toHaveBeenCalled();
    expect(Logger.log).toHaveBeenCalledWith(
      expect.stringContaining("Testing mode: Skipping compile-check commands"),
    );
  });

  it("should skip destructive folder removal in clean action during testing mode", async () => {
    args.editArg("testing", true);
    args.editArg("action", "clean");
    await rootCommands.run();
    expect(fs.promises.rm).not.toHaveBeenCalled();
    expect(child_process.execSync).not.toHaveBeenCalledWith(
      "yarn cache clean",
      expect.anything(),
    );
  });
});
