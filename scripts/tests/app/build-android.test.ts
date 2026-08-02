import { describe, it, expect, beforeEach, afterAll, jest } from '@jest/globals';
import { args } from "../../arguments.ts";
import { run } from "../../app/build-android.ts";
import child_process from "child_process";
import { Logger } from "@commonSrc/serverOrElectron/logger.ts";

jest.mock("child_process", () => ({
  execSync: jest.fn(),
  spawn: jest.fn().mockReturnValue({
    exitCode: 0,
    once: jest.fn((event: string, cb: () => void) => {
      if (event === "close") cb();
    }),
    kill: jest.fn(),
  }),
}));

jest.mock("fs", () => ({
  ...(jest.requireActual("fs") as Record<string, unknown>),
  existsSync: jest.fn().mockReturnValue(true),
  rmSync: jest.fn(),
}));

jest.mock("@commonSrc/serverOrElectron/logger.ts", () => ({
  Logger: {
    log: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
  },
}));

// Mock config asking
jest.mock("../../config.ts", () => ({
  ...(jest.requireActual("../../config.ts") as Record<string, unknown>),
  ask: jest.fn<() => Promise<string>>().mockResolvedValue("y"),
  deleteAndroidFromGitIgnore: jest.fn(),
  handleExitFromScript: jest.fn(),
}));

describe("build-android script", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    args.editArg("yes", true);
    jest.spyOn(process, "exit").mockImplementation((() => {}) as () => never);
  });

  afterAll(() => {
    jest.restoreAllMocks();
  });

  it("should spawn eas build and install apk in normal mode", async () => {
    args.editArg("testing", false);
    args.editArg("BUILD_PROFILE", "development");

    await run();

    expect(child_process.execSync).toHaveBeenCalledWith(
      expect.stringContaining("yarn run app-prebuild-android"),
      expect.anything()
    );
    expect(child_process.spawn).toHaveBeenCalledWith(
      "taskset",
      expect.arrayContaining(["eas", "build", "--platform", "android"]),
      expect.anything()
    );
    expect(child_process.execSync).toHaveBeenCalledWith(
      expect.stringContaining("adb install"),
      expect.anything()
    );
  });

  it("should skip destructive operations in testing mode", async () => {
    args.editArg("testing", true);
    args.editArg("BUILD_PROFILE", "development");

    await run();

    expect(child_process.execSync).not.toHaveBeenCalledWith(
      expect.stringContaining("yarn run app-prebuild-android"),
      expect.anything()
    );
    expect(child_process.spawn).not.toHaveBeenCalledWith(
      "taskset",
      expect.arrayContaining(["eas", "build", "--platform", "android"]),
      expect.anything()
    );
    expect(child_process.execSync).not.toHaveBeenCalledWith(
      expect.stringContaining("adb install"),
      expect.anything()
    );

    expect(Logger.log).toHaveBeenCalledWith(expect.stringContaining("Testing mode: Skipping app-prebuild-android"));
    expect(Logger.log).toHaveBeenCalledWith(expect.stringContaining("Testing mode: Skipping eas build for android"));
    expect(Logger.log).toHaveBeenCalledWith(expect.stringContaining("Testing mode: Skipping adb install"));
  });
});
