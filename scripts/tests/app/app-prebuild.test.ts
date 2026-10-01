import {
  it,
  jest,
  expect,
  describe,
  afterAll,
  beforeEach,
} from "@jest/globals";
import fs from "fs";
import { args } from "../../arguments.ts";
import { script } from "../../app/app-prebuild.ts";
import child_process from "child_process";

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
  existsSync: jest.fn().mockReturnValue(true),
  readFileSync: jest
    .fn<(path: string) => string>()
    .mockImplementation((path: string) => {
      if (path.includes("gradle.properties"))
        return "org.gradle.jvmargs=-Xmx2048m";
      if (path.includes("strings.xml"))
        return "<resources>\n<en>Test</en>\n<es>Prueba</es>\n</resources>";
      if (path.includes("build.gradle"))
        return "packagingOptions { }\n dependencies { }";
      if (path.includes("MainApplication.kt"))
        return "package com.example\nPackageList(this).packages.apply { }";
      if (path.includes("package.json")) return '{"version": "1.0.0"}';
      if (path.includes("modules.json")) return "[]";
      if (path.includes("AndroidManifest.xml"))
        return '<manifest><application></application><activity android:name="MainActivity"></activity></manifest>';
      return "";
    }),
  writeFileSync: jest.fn(),
  mkdirSync: jest.fn(),
  rmSync: jest.fn(),
  copyFileSync: jest.fn(),
  readdirSync: jest.fn().mockReturnValue([]),
  promises: {
    access: jest.fn<() => Promise<unknown>>().mockResolvedValue(undefined),
    readFile: jest
      .fn<(path: string) => Promise<string>>()
      .mockImplementation(async (path: string) => {
        if (path.includes("gradle.properties"))
          return "org.gradle.jvmargs=-Xmx2048m";
        if (path.includes("strings.xml"))
          return "<resources>\n<en>Test</en>\n<es>Prueba</es>\n</resources>";
        if (path.includes("build.gradle"))
          return "packagingOptions { }\n dependencies { }";
        if (path.includes("MainApplication.kt"))
          return "package com.example\nPackageList(this).packages.apply { }";
        if (path.includes("package.json")) return '{"version": "1.0.0"}';
        if (path.includes("modules.json")) return "[]";
        if (path.includes("AndroidManifest.xml"))
          return '<manifest><application></application><activity android:name="MainActivity"></activity></manifest>';
        return "";
      }),
    writeFile: jest.fn<() => Promise<unknown>>().mockResolvedValue(undefined),
    mkdir: jest.fn<() => Promise<unknown>>().mockResolvedValue(undefined),
    rm: jest.fn<() => Promise<unknown>>().mockResolvedValue(undefined),
    copyFile: jest.fn<() => Promise<unknown>>().mockResolvedValue(undefined),
    readdir: jest.fn<() => Promise<unknown>>().mockResolvedValue([]),
    stat: jest.fn<() => Promise<unknown>>().mockResolvedValue({}),
  },
}));

describe("app-prebuild script", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  afterAll(() => {
    jest.restoreAllMocks();
  });

  it("should attempt file modifications and prebuild in normal mode", async () => {
    args.editArg("testing", false);
    await script.run();

    expect(child_process.exec).toHaveBeenCalledWith(
      expect.stringContaining("yarn expo prebuild"),
      expect.anything(),
    );
    expect(fs.promises.writeFile).toHaveBeenCalled();
    expect(fs.promises.rm).toHaveBeenCalled();
  });

  it("should skip destructive operations in testing mode", async () => {
    args.editArg("testing", true);
    await script.run();

    expect(child_process.execSync).not.toHaveBeenCalledWith(
      expect.stringContaining("yarn expo prebuild"),
      expect.anything(),
    );
    expect(fs.promises.writeFile).not.toHaveBeenCalled();
    expect(fs.promises.rm).not.toHaveBeenCalled();
  });
});
