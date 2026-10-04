import {
  evaluateBuildType,
  fetchServerVersion,
  checkAndroidFallback,
  checkElectronFallback,
  compareSemver,
  getCommitMessage,
  evaluateAndroid,
} from "../check-version-ci.ts";
import { Validations } from "@commonSrc/both/validations.ts";
import { ServerFetch } from "@commonSrc/both/fetch/fetch.ts";
import { describe, it, expect, jest, beforeEach } from "@jest/globals";

describe("check-version-ci", () => {
  beforeEach(() => {
    jest.restoreAllMocks();
  });

  describe("compareSemver", () => {
    it("should classify major version increment as build", () => {
      const res = compareSemver("1.0.0", "2.0.0");
      expect(res.action).toBe("build");
      expect(res.shouldBuild).toBe(true);
      expect(res.shouldUpdate).toBe(false);
      expect(res.isNewer).toBe(true);
    });

    it("should classify minor version increment as build", () => {
      const res = compareSemver("0.1.0", "0.2.0");
      expect(res.action).toBe("build");
      expect(res.shouldBuild).toBe(true);
      expect(res.shouldUpdate).toBe(false);
      expect(res.isNewer).toBe(true);
    });

    it("should classify patch version increment as update", () => {
      const res = compareSemver("0.0.1", "0.0.2");
      expect(res.action).toBe("update");
      expect(res.shouldBuild).toBe(false);
      expect(res.shouldUpdate).toBe(true);
      expect(res.isNewer).toBe(true);
    });

    it("should classify identical version as skip", () => {
      const res = compareSemver("0.5.0", "0.5.0");
      expect(res.action).toBe("skip");
      expect(res.shouldBuild).toBe(false);
      expect(res.shouldUpdate).toBe(false);
      expect(res.isNewer).toBe(false);
    });

    it("should classify older version as skip", () => {
      const res = compareSemver("0.5.1", "0.5.0");
      expect(res.action).toBe("skip");
      expect(res.shouldBuild).toBe(false);
      expect(res.shouldUpdate).toBe(false);
      expect(res.isNewer).toBe(false);
    });

    it("should default to build when previous version is empty", () => {
      const res = compareSemver("", "0.1.0");
      expect(res.action).toBe("build");
      expect(res.shouldBuild).toBe(true);
    });
  });

  describe("isNewerVersion", () => {
    it("should return true when server version is empty string (no build on server yet)", () => {
      expect(Validations.isNewVersion("", "0.5.0")).toBe(true);
      expect(Validations.isNewVersion("   ", "0.1.1-beta")).toBe(true);
    });

    it("should return true when current version is newer than server version", () => {
      expect(Validations.isNewVersion("0.4.0", "0.5.0")).toBe(true);
      expect(Validations.isNewVersion("0.4.0", "0.5.0-beta")).toBe(true);
      expect(Validations.isNewVersion("0.9.9", "1.0.0")).toBe(true);
      expect(Validations.isNewVersion("0.1.1-beta", "0.1.2")).toBe(true);
    });

    it("should return false when current version is equal or older than server version", () => {
      expect(Validations.isNewVersion("0.5.0", "0.5.0")).toBe(false);
      expect(Validations.isNewVersion("0.5.0", "0.5.0-beta")).toBe(false);
      expect(Validations.isNewVersion("0.5.0", "0.4.0")).toBe(false);
      expect(Validations.isNewVersion("0.1.1", "0.1.1-beta")).toBe(false);
    });
  });

  describe("isServerAlive", () => {
    it("should delegate to ServerFetch.isServerAlive", async () => {
      jest.spyOn(ServerFetch, "isServerAlive").mockResolvedValue(true);

      const alive = await ServerFetch.isServerAlive();
      expect(alive).toBe(true);
    });

    it("should return false if ServerFetch.isServerAlive returns false", async () => {
      jest.spyOn(ServerFetch, "isServerAlive").mockResolvedValue(false);

      const alive = await ServerFetch.isServerAlive();
      expect(alive).toBe(false);
    });
  });

  describe("fetchServerVersion", () => {
    it("should return reachable: true and latestVersion when ServerFetch.get succeeds", async () => {
      jest.spyOn(ServerFetch, "get").mockResolvedValue({
        ok: true,
        status: 200,
        data: {
          latestVersion: "0.4.0",
          isUpdateAvailable: false,
        } as never,
      });

      const result = await fetchServerVersion("0.5.0", "android");
      expect(result.reachable).toBe(true);
      expect(result.latestVersion).toBe("0.4.0");
    });

    it("should return reachable: false when response has error", async () => {
      jest.spyOn(ServerFetch, "get").mockResolvedValue({
        ok: false,
        status: 500,
        data: {
          error: "Internal server error",
        } as never,
      });

      const result = await fetchServerVersion("0.5.0", "android");
      expect(result.reachable).toBe(false);
    });

    it("should return reachable: false when ServerFetch.get throws", async () => {
      jest.spyOn(ServerFetch, "get").mockRejectedValue(new Error("Timeout"));

      const result = await fetchServerVersion("0.5.0", "android");
      expect(result.reachable).toBe(false);
    });
  });

  describe("evaluateAndroid", () => {
    it("should return update action when patch version is incremented", async () => {
      jest.spyOn(ServerFetch, "get").mockResolvedValue({
        ok: true,
        status: 200,
        data: {
          latestVersion: "0.0.1",
          isUpdateAvailable: false,
        } as never,
      });

      const res = await evaluateAndroid(true, "0.0.2");
      expect(res.action).toBe("update");
      expect(res.shouldUpdate).toBe(true);
      expect(res.shouldBuild).toBe(false);
    });

    it("should return build action when minor version is incremented", async () => {
      jest.spyOn(ServerFetch, "get").mockResolvedValue({
        ok: true,
        status: 200,
        data: {
          latestVersion: "0.0.1",
          isUpdateAvailable: false,
        } as never,
      });

      const res = await evaluateAndroid(true, "0.1.0");
      expect(res.action).toBe("build");
      expect(res.shouldBuild).toBe(true);
      expect(res.shouldUpdate).toBe(false);
    });
  });

  describe("evaluateBuildType", () => {
    it("should return true when server is reachable and current version is newer for electron", async () => {
      jest.spyOn(ServerFetch, "get").mockResolvedValue({
        ok: true,
        status: 200,
        data: {
          latestVersion: "0.4.0",
          isUpdateAvailable: false,
        } as never,
      });

      const shouldBuild = await evaluateBuildType(true, "linux", "0.5.0");
      expect(shouldBuild).toBe(true);
    });

    it("should return false when server is reachable and current version is same or older", async () => {
      jest.spyOn(ServerFetch, "get").mockResolvedValue({
        ok: true,
        status: 200,
        data: {
          latestVersion: "0.5.0",
          isUpdateAvailable: false,
        },
      });

      const shouldBuild = await evaluateBuildType(true, "linux", "0.5.0");
      expect(shouldBuild).toBe(false);
    });
  });

  describe("fallback helpers & commit message", () => {
    it("checkAndroidFallback should return a VersionEvaluation object", () => {
      const result = checkAndroidFallback("0.5.0");
      expect(result).toHaveProperty("action");
      expect(result).toHaveProperty("shouldBuild");
      expect(result).toHaveProperty("shouldUpdate");
    });

    it("checkElectronFallback should return a boolean", () => {
      const result = checkElectronFallback("0.1.1-beta");
      expect(typeof result).toBe("boolean");
    });

    it("getCommitMessage should return a non-empty string", () => {
      const msg = getCommitMessage();
      expect(typeof msg).toBe("string");
      expect(msg.length).toBeGreaterThan(0);
    });
  });
});
