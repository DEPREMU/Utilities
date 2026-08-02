import { describe, it, expect, beforeEach, afterAll, jest } from '@jest/globals';
import { args } from "../../arguments.ts";
import { run } from "../../UtilitiesForPC/build-app-electron.ts";
import child_process from "child_process";
import { Logger } from "@commonSrc/serverOrElectron/logger.ts";

jest.mock("child_process", () => ({
  execSync: jest.fn(),
}));

jest.mock("fs", () => ({
  ...(jest.requireActual("fs") as Record<string, unknown>),
  existsSync: jest.fn().mockReturnValue(true),
  rmSync: jest.fn(),
  cpSync: jest.fn(),
  renameSync: jest.fn(),
  mkdirSync: jest.fn(),
  readdirSync: jest.fn().mockReturnValue(["app.exe", "app.deb"]),
  writeFileSync: jest.fn(),
}));

jest.mock("@commonSrc/serverOrElectron/logger.ts", () => ({
  Logger: {
    log: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
  },
}));

jest.mock("../../config.ts", () => ({
  ...(jest.requireActual("../../config.ts") as Record<string, unknown>),
  ask: jest.fn<() => Promise<string>>().mockResolvedValue("y"),
  handleExitFromScript: jest.fn((_cb: () => void) => {
    // just for mock structure
  }),
}));

describe("build-app-electron script", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    args.editArg("yes", true);
  });

  afterAll(() => {
    jest.restoreAllMocks();
  });

  it("should run build commands in normal mode", async () => {
    args.editArg("testing", false);

    await run();

    expect(child_process.execSync).toHaveBeenCalledWith(
      expect.stringContaining("yarn run build-web-app-electron"),
      expect.anything()
    );
    expect(child_process.execSync).toHaveBeenCalledWith(
      expect.stringContaining("yarn run build-resources-electron"),
      expect.anything()
    );
    expect(child_process.execSync).toHaveBeenCalledWith(
      expect.stringContaining("yarn electron-builder"),
      expect.anything()
    );
  });

  it("should skip destructive operations in testing mode", async () => {
    args.editArg("testing", true);

    await run();

    expect(child_process.execSync).not.toHaveBeenCalledWith(
      expect.stringContaining("yarn run build-web-app-electron"),
      expect.anything()
    );
    expect(child_process.execSync).not.toHaveBeenCalledWith(
      expect.stringContaining("yarn run build-resources-electron"),
      expect.anything()
    );
    expect(child_process.execSync).not.toHaveBeenCalledWith(
      expect.stringContaining("yarn electron-builder"),
      expect.anything()
    );
    expect(child_process.execSync).not.toHaveBeenCalledWith(
      expect.stringContaining("sudo apt install"),
      expect.anything()
    );

    expect(Logger.log).toHaveBeenCalledWith(expect.stringContaining("Testing mode: Skipping build-web-app-electron"));
    expect(Logger.log).toHaveBeenCalledWith(expect.stringContaining("Testing mode: Skipping build-resources-electron"));
  });
});
