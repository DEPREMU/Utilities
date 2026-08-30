import {
  describe,
  it,
  expect,
  beforeEach,
  beforeAll,
  afterAll,
  jest,
} from "@jest/globals";
import { args } from "../../arguments.ts";
import { script } from "../../UtilitiesForPC/build-app-electron.ts";
import child_process from "child_process";
import { Logger } from "@commonSrc/serverOrElectron/logger.ts";

jest.mock("child_process", () => ({
  execSync: jest.fn(),
  exec: jest.fn().mockReturnValue({
    stdout: { on: jest.fn() },
    stderr: { on: jest.fn() },
    on: jest.fn((event, cb) => {
      if (event === "close") (cb as (code: number) => void)(0);
    }),
  }),
}));

jest.mock("fs", () => ({
  ...(jest.requireActual("fs") as Record<string, unknown>),
  accessSync: jest.fn(),
  existsSync: jest.fn().mockReturnValue(true),
  rmSync: jest.fn(),
  cpSync: jest.fn(),
  renameSync: jest.fn(),
  mkdirSync: jest.fn(),
  readdirSync: jest.fn().mockReturnValue(["app.exe", "app.deb"]),
  writeFileSync: jest.fn(),
  promises: {
    access: jest.fn<() => Promise<unknown>>().mockResolvedValue(undefined),
    stat: jest.fn<() => Promise<unknown>>().mockResolvedValue({}),
    mkdir: jest.fn<() => Promise<unknown>>().mockResolvedValue(undefined),
    cp: jest.fn<() => Promise<unknown>>().mockResolvedValue(undefined),
    copyFile: jest.fn<() => Promise<unknown>>().mockResolvedValue(undefined),
    rename: jest.fn<() => Promise<unknown>>().mockResolvedValue(undefined),
    rm: jest.fn<() => Promise<unknown>>().mockResolvedValue(undefined),
    readdir: jest
      .fn<() => Promise<unknown>>()
      .mockResolvedValue(["app.exe", "app.deb"]),
    writeFile: jest.fn<() => Promise<unknown>>().mockResolvedValue(undefined),
  },
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

interface ScriptInternals {
  stepFunctions: unknown[];
  stopped: boolean;
}

describe("build-app-electron script", () => {
  let originalSteps: unknown[];

  beforeAll(() => {
    originalSteps = [...(script as unknown as ScriptInternals).stepFunctions];
  });

  beforeEach(() => {
    jest.clearAllMocks();
    args.editArg("yes", true);
    (script as unknown as ScriptInternals).stepFunctions = [...originalSteps];
    (script as unknown as ScriptInternals).stopped = false;
  });

  afterAll(() => {
    jest.restoreAllMocks();
  });

  it("should run build commands in normal mode", async () => {
    args.editArg("testing", false);

    await script.run();

    expect(child_process.exec).toHaveBeenCalledWith(
      expect.stringContaining("yarn run build-web-app-electron"),
      expect.anything(),
    );
    expect(child_process.exec).toHaveBeenCalledWith(
      expect.stringContaining("yarn run build-resources-electron"),
      expect.anything(),
    );
    expect(child_process.exec).toHaveBeenCalledWith(
      expect.stringContaining("yarn electron-builder"),
      expect.anything(),
    );
  });

  it("should skip destructive operations in testing mode", async () => {
    args.editArg("testing", true);

    await script.run();

    expect(child_process.execSync).not.toHaveBeenCalledWith(
      expect.stringContaining("yarn run build-web-app-electron"),
      expect.anything(),
    );
    expect(child_process.execSync).not.toHaveBeenCalledWith(
      expect.stringContaining("yarn run build-resources-electron"),
      expect.anything(),
    );
    expect(child_process.execSync).not.toHaveBeenCalledWith(
      expect.stringContaining("yarn electron-builder"),
      expect.anything(),
    );
    expect(child_process.execSync).not.toHaveBeenCalledWith(
      expect.stringContaining("sudo apt install"),
      expect.anything(),
    );

    expect(Logger.log).toHaveBeenCalledWith(
      expect.stringContaining("Testing mode: Skipping build-web-app-electron"),
    );
    expect(Logger.log).toHaveBeenCalledWith(
      expect.stringContaining(
        "Testing mode: Skipping build-resources-electron",
      ),
    );
  });
});
