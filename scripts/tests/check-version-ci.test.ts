import {
  type HttpClient,
  type HttpResponse,
  isServerAlive,
  compareSemver,
  evaluateAndroid,
  getCommitMessage,
  resolveHttpClient,
  createAxiosClient,
  createFetchClient,
  evaluateBuildType,
  fetchServerVersion,
  checkAndroidFallback,
  resetHttpClientCache,
  isModuleNotFoundError,
  checkElectronFallback,
} from "../check-version-ci.ts";
import { Validations } from "@commonSrc/both/validations.ts";
import { describe, it, expect, jest, beforeEach } from "@jest/globals";

describe("check-version-ci", () => {
  beforeEach(() => {
    jest.restoreAllMocks();
    resetHttpClientCache();
  });

  describe("HTTP Transport & Dynamic Module Loading", () => {
    it("should resolve to Axios client when Axios module is available", async () => {
      const mockAxios = {
        default: {
          get: jest.fn(() =>
            Promise.resolve({
              status: 200,
              data: { ok: true },
            }),
          ),
        },
      };

      const result = await resolveHttpClient(async () => mockAxios);
      expect(result.transport).toBe("axios");

      const response = await result.client.get("http://test.local");
      expect(response.ok).toBe(true);
      expect(response.status).toBe(200);
      expect(response.data).toEqual({ ok: true });
    });

    it("should fall back to native Fetch when Axios module is unavailable (ERR_MODULE_NOT_FOUND)", async () => {
      const notFoundErr = Object.assign(
        new Error("Cannot find package 'axios'"),
        { code: "ERR_MODULE_NOT_FOUND" },
      );

      const result = await resolveHttpClient(async () => {
        throw notFoundErr;
      });

      expect(result.transport).toBe("fetch");
      expect(result.client).toBeDefined();
    });

    it("should fall back to native Fetch when error code is MODULE_NOT_FOUND", async () => {
      const notFoundErr = Object.assign(
        new Error("Cannot find module 'axios'"),
        { code: "MODULE_NOT_FOUND" },
      );

      const result = await resolveHttpClient(async () => {
        throw notFoundErr;
      });

      expect(result.transport).toBe("fetch");
    });

    it("should rethrow unexpected errors during Axios import instead of swallowing them", async () => {
      const syntaxError = new SyntaxError("Unexpected token in axios bundle");

      await expect(
        resolveHttpClient(async () => {
          throw syntaxError;
        }),
      ).rejects.toThrow("Unexpected token in axios bundle");
    });

    it("isModuleNotFoundError should return true only for missing module errors", () => {
      expect(isModuleNotFoundError({ code: "ERR_MODULE_NOT_FOUND" })).toBe(
        true,
      );
      expect(isModuleNotFoundError({ code: "MODULE_NOT_FOUND" })).toBe(true);
      expect(
        isModuleNotFoundError({
          message: "Cannot find package 'axios' imported from...",
        }),
      ).toBe(true);
      expect(isModuleNotFoundError(new TypeError("Invalid argument"))).toBe(
        false,
      );
      expect(isModuleNotFoundError(null)).toBe(false);
    });

    it("createAxiosClient should format responses consistently with status and ok", async () => {
      const mockAxios = {
        get: jest.fn(() =>
          Promise.resolve({
            status: 404,
            data: { error: "Not Found" },
          }),
        ),
      };

      const client = createAxiosClient(mockAxios);
      const res = await client.get("http://example.com/api");

      expect(res.ok).toBe(false);
      expect(res.status).toBe(404);
      expect(res.data).toEqual({ error: "Not Found" });
    });

    it("createFetchClient should handle JSON responses and HTTP status", async () => {
      const fakeFetch = jest.fn(() =>
        Promise.resolve({
          status: 200,
          headers: new Headers({ "content-type": "application/json" }),
          json: async () => ({ latestVersion: "1.0.0" }),
        }),
      );
      globalThis.fetch = fakeFetch as never;

      const client = createFetchClient();
      const res = await client.get("http://example.com/api");

      expect(res.ok).toBe(true);
      expect(res.status).toBe(200);
      expect(res.data).toEqual({ latestVersion: "1.0.0" });
    });

    it("Axios client should preserve network failures without switching to fetch", async () => {
      const mockAxios = {
        get: jest.fn(() => Promise.reject(new Error("ECONNREFUSED"))),
      };
      const client = createAxiosClient(mockAxios);

      await expect(client.get("http://unreachable.test")).rejects.toThrow(
        "ECONNREFUSED",
      );
    });
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

    it("should classify patch version increment as update (for Android)", () => {
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
      expect(res.isNewer).toBe(true);
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

  const createMockClient = (
    response: Partial<HttpResponse> | Error,
  ): HttpClient => ({
    get: jest.fn(async () => {
      if (response instanceof Error) throw response;
      return {
        ok: response.ok ?? true,
        status: response.status ?? 200,
        data: response.data,
      };
    }) as never,
  });

  describe("isServerAlive", () => {
    it("should return true when /info/generate204 returns 204 or 200", async () => {
      const mockClient = createMockClient({ status: 204, ok: true, data: "" });
      const alive = await isServerAlive(mockClient);
      expect(alive).toBe(true);
    });

    it("should return false when server returns 500 or request fails", async () => {
      const mockClient = createMockClient({ status: 500, ok: false, data: "" });
      const alive = await isServerAlive(mockClient);
      expect(alive).toBe(false);
    });
  });

  describe("fetchServerVersion", () => {
    it("should return reachable: true and latestVersion when request succeeds", async () => {
      const mockClient = createMockClient({
        ok: true,
        status: 200,
        data: {
          latestVersion: "0.4.0",
          isUpdateAvailable: false,
        },
      });

      const result = await fetchServerVersion("0.5.0", "android", mockClient);
      expect(result.reachable).toBe(true);
      expect(result.latestVersion).toBe("0.4.0");
    });

    it("should return reachable: false when response has error status", async () => {
      const mockClient = createMockClient({
        ok: false,
        status: 500,
        data: { error: "Internal server error" },
      });

      const result = await fetchServerVersion("0.5.0", "android", mockClient);
      expect(result.reachable).toBe(false);
      expect(result.error).toBe("Internal server error");
    });

    it("should return reachable: false when client throws network error", async () => {
      const mockClient = createMockClient(new Error("Timeout"));

      const result = await fetchServerVersion("0.5.0", "android", mockClient);
      expect(result.reachable).toBe(false);
      expect(result.error).toBe("Timeout");
    });
  });

  describe("evaluateAndroid", () => {
    it("should return update action when patch version is incremented", async () => {
      const mockClient = createMockClient({
        ok: true,
        status: 200,
        data: {
          latestVersion: "0.0.1",
          isUpdateAvailable: false,
        },
      });

      const res = await evaluateAndroid(
        true,
        "0.0.2",
        process.cwd(),
        mockClient,
      );
      expect(res.action).toBe("update");
      expect(res.shouldUpdate).toBe(true);
      expect(res.shouldBuild).toBe(false);
    });

    it("should return build action when minor version is incremented", async () => {
      const mockClient = createMockClient({
        ok: true,
        status: 200,
        data: {
          latestVersion: "0.0.1",
          isUpdateAvailable: false,
        },
      });

      const res = await evaluateAndroid(
        true,
        "0.1.0",
        process.cwd(),
        mockClient,
      );
      expect(res.action).toBe("build");
      expect(res.shouldBuild).toBe(true);
      expect(res.shouldUpdate).toBe(false);
    });
  });

  describe("evaluateBuildType & Electron Patch Detection", () => {
    it("should return true when server is reachable and current version has patch increment for Electron", async () => {
      const mockClient = createMockClient({
        ok: true,
        status: 200,
        data: {
          latestVersion: "0.8.0-beta",
          isUpdateAvailable: false,
        },
      });

      // Patch release on Electron MUST trigger a build
      const shouldBuild = await evaluateBuildType(
        true,
        "linux",
        "0.8.1-beta",
        process.cwd(),
        mockClient,
      );
      expect(shouldBuild).toBe(true);
    });

    it("should return true when minor version is incremented for Electron", async () => {
      const mockClient = createMockClient({
        ok: true,
        status: 200,
        data: {
          latestVersion: "0.8.0-beta",
          isUpdateAvailable: false,
        },
      });

      const shouldBuild = await evaluateBuildType(
        true,
        "windows",
        "0.9.0-beta",
        process.cwd(),
        mockClient,
      );
      expect(shouldBuild).toBe(true);
    });

    it("should return false when server is reachable and current version is same or older", async () => {
      const mockClient = createMockClient({
        ok: true,
        status: 200,
        data: {
          latestVersion: "0.8.0-beta",
          isUpdateAvailable: false,
        },
      });

      const shouldBuild = await evaluateBuildType(
        true,
        "linux",
        "0.8.0-beta",
        process.cwd(),
        mockClient,
      );
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
