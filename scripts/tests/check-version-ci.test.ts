import {
  isNewerVersion,
  isServerAlive,
  evaluateBuildType,
  fetchServerVersion,
  checkAndroidFallback,
  checkElectronFallback,
} from "../check-version-ci.ts";
import { ServerFetch } from "@commonSrc/both/fetch/fetch.ts";
import { describe, it, expect, jest, beforeEach } from "@jest/globals";

describe("check-version-ci", () => {
  beforeEach(() => {
    jest.restoreAllMocks();
  });

  describe("isNewerVersion", () => {
    it("should return true when server version is empty string (no build on server yet)", () => {
      expect(isNewerVersion("0.5.0", "")).toBe(true);
      expect(isNewerVersion("0.1.1-beta", "   ")).toBe(true);
    });

    it("should return true when current version is newer than server version", () => {
      expect(isNewerVersion("0.5.0", "0.4.0")).toBe(true);
      expect(isNewerVersion("0.5.0-beta", "0.4.0")).toBe(true);
      expect(isNewerVersion("1.0.0", "0.9.9")).toBe(true);
      expect(isNewerVersion("0.1.2", "0.1.1-beta")).toBe(true);
    });

    it("should return false when current version is equal or older than server version", () => {
      expect(isNewerVersion("0.5.0", "0.5.0")).toBe(false);
      expect(isNewerVersion("0.5.0-beta", "0.5.0")).toBe(false);
      expect(isNewerVersion("0.4.0", "0.5.0")).toBe(false);
      expect(isNewerVersion("0.1.1-beta", "0.1.1")).toBe(false);
    });
  });

  describe("isServerAlive", () => {
    it("should delegate to ServerFetch.isServerAlive", async () => {
      jest.spyOn(ServerFetch, "isServerAlive").mockResolvedValue(true);

      const alive = await isServerAlive("https://api.example.com");
      expect(alive).toBe(true);
      expect(ServerFetch.API_URL).toBe("https://api.example.com");
    });

    it("should return false if ServerFetch.isServerAlive returns false", async () => {
      jest.spyOn(ServerFetch, "isServerAlive").mockResolvedValue(false);

      const alive = await isServerAlive("https://api.example.com");
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

  describe("evaluateBuildType", () => {
    it("should return true when server is reachable and current version is newer", async () => {
      jest.spyOn(ServerFetch, "get").mockResolvedValue({
        ok: true,
        status: 200,
        data: {
          latestVersion: "0.4.0",
          isUpdateAvailable: false,
        } as never,
      });

      const shouldBuild = await evaluateBuildType(
        "https://api.example.com",
        true,
        "android",
        "0.5.0",
      );
      expect(shouldBuild).toBe(true);
    });

    it("should return false when server is reachable and current version is same or older", async () => {
      jest.spyOn(ServerFetch, "get").mockResolvedValue({
        ok: true,
        status: 200,
        data: {
          latestVersion: "0.5.0",
          isUpdateAvailable: false,
        } as never,
      });

      const shouldBuild = await evaluateBuildType(
        "https://api.example.com",
        true,
        "android",
        "0.5.0",
      );
      expect(shouldBuild).toBe(false);
    });

    it("should fallback to git comparison when server is not reachable", async () => {
      const shouldBuild = await evaluateBuildType(
        "",
        false,
        "android",
        "0.5.0-beta",
      );
      expect(typeof shouldBuild).toBe("boolean");
    });
  });

  describe("fallback helpers", () => {
    it("checkAndroidFallback should return a boolean", () => {
      const result = checkAndroidFallback("0.5.0");
      expect(typeof result).toBe("boolean");
    });

    it("checkElectronFallback should return a boolean", () => {
      const result = checkElectronFallback("0.1.1-beta");
      expect(typeof result).toBe("boolean");
    });
  });
});
