import { describe, it, expect, beforeEach, afterAll, jest } from '@jest/globals';
import { args } from "../../arguments.ts";
import { runPrebuild } from "../../app/app-prebuild.ts";
import child_process from "child_process";
import fs from "fs";

jest.mock("child_process", () => ({
  execSync: jest.fn().mockReturnValue("Finished prebuild"),
}));

jest.mock("fs", () => ({
  ...(jest.requireActual("fs") as Record<string, unknown>),
  existsSync: jest.fn().mockReturnValue(true),
  readFileSync: jest.fn<(path: string) => string>().mockImplementation((path: string) => {
    if (path.includes("gradle.properties")) return "org.gradle.jvmargs=-Xmx2048m";
    if (path.includes("strings.xml")) return "<resources>\n<en>Test</en>\n<es>Prueba</es>\n</resources>";
    if (path.includes("build.gradle")) return "packagingOptions { }\n dependencies { }";
    if (path.includes("MainApplication.kt")) return "package com.example\nPackageList(this).packages.apply { }";
    if (path.includes("package.json")) return '{"version": "1.0.0"}';
    if (path.includes("modules.json")) return "[]";
    if (path.includes("AndroidManifest.xml")) return "<manifest><application></application><activity android:name=\"MainActivity\"></activity></manifest>";
    return "";
  }),
  writeFileSync: jest.fn(),
  mkdirSync: jest.fn(),
  rmSync: jest.fn(),
  copyFileSync: jest.fn(),
  readdirSync: jest.fn().mockReturnValue([]),
}));

describe("app-prebuild script", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  afterAll(() => {
    jest.restoreAllMocks();
  });

  it("should attempt file modifications and prebuild in normal mode", () => {
    args.editArg("testing", false);
    runPrebuild();

    expect(child_process.execSync).toHaveBeenCalledWith(
      expect.stringContaining("yarn expo prebuild"),
      expect.anything()
    );
    expect(fs.writeFileSync).toHaveBeenCalled();
    expect(fs.rmSync).toHaveBeenCalled();
  });

  it("should skip destructive operations in testing mode", () => {
    args.editArg("testing", true);
    runPrebuild();

    expect(child_process.execSync).not.toHaveBeenCalledWith(
      expect.stringContaining("yarn expo prebuild"),
      expect.anything()
    );
    expect(fs.writeFileSync).not.toHaveBeenCalled();
    expect(fs.rmSync).not.toHaveBeenCalled();
  });
});
