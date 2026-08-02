import { describe, it, expect, beforeEach, afterAll, jest } from '@jest/globals';
import { args } from "../arguments.ts";
import { run } from "../update.ts";
import child_process from "child_process";
import { Logger } from "@commonSrc/serverOrElectron/logger.ts";
import axios from "axios";

jest.mock("child_process", () => ({
  execSync: jest.fn(),
}));

jest.mock("axios", () => ({
  post: jest.fn<() => Promise<{ data: { latestVersion: string } }>>().mockResolvedValue({ data: { latestVersion: "1.0.0" } }),
}));

jest.mock("fs", () => ({
  ...(jest.requireActual("fs") as Record<string, unknown>),
  existsSync: jest.fn().mockReturnValue(true),
  readdirSync: jest.fn().mockReturnValue([
    { isFile: () => true, isDirectory: () => false, name: "index.html" }
  ]),
  createWriteStream: jest.fn().mockReturnValue({
    on: jest.fn(),
    once: jest.fn(),
    emit: jest.fn(),
  }),
  createReadStream: jest.fn().mockReturnValue({}),
}));

jest.mock("@commonSrc/serverOrElectron/logger.ts", () => ({
  Logger: {
    log: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
  },
}));

// Mock archiver zip stream
jest.mock("archiver", () => ({
  ZipArchive: jest.fn().mockImplementation(() => ({
    pipe: jest.fn(),
    file: jest.fn(),
    directory: jest.fn(),
    finalize: jest.fn<() => Promise<void>>().mockResolvedValue(undefined),
  })),
}));

describe("update script", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  afterAll(() => {
    jest.restoreAllMocks();
  });

  it("should attempt to upload updates in normal mode if new version", async () => {
    args.editArg("testing", false);
    args.editArg("platform-update-assets", "both");

    await run();

    // Axios should be called to check for versions and upload
    expect(axios.post).toHaveBeenCalled();
    // eas update should be called for Android
    expect(child_process.execSync).toHaveBeenCalledWith(
      expect.stringContaining("eas update"),
      expect.anything()
    );
  });

  it("should skip eas update and actual axios uploads in testing mode", async () => {
    args.editArg("testing", true);
    args.editArg("platform-update-assets", "both");

    await run();

    // Verify eas update was skipped
    expect(child_process.execSync).not.toHaveBeenCalledWith(
      expect.stringContaining("eas update"),
      expect.anything()
    );
    expect(Logger.log).toHaveBeenCalledWith(
      expect.stringContaining("Testing mode: Skipping eas update for Android assets")
    );

    // Verify axios upload was skipped due to testing mode check in uploadWeb
    expect(Logger.log).toHaveBeenCalledWith(
      expect.stringContaining("Testing mode enabled - skipping actual upload"),
      expect.anything()
    );
  });
});
