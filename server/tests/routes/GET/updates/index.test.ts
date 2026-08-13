import { describe, expect, it } from "@jest/globals";
import { ServerFetch } from "@common";

describe("GET /updates", () => {
  describe("/updates/is-update-available/:version/:buildType", () => {
    it("should check update availability for Android build", async () => {
      const res = await ServerFetch.get(
        "/updates/is-update-available/:version/:buildType",
        { params: { version: "1.0.0", buildType: "android" } },
      );
      expect(res.ok).toBe(true);
      expect(res.data).toHaveProperty("isUpdateAvailable");
      expect(res.data).toHaveProperty("latestVersion");
    });

    it("should check update availability for Windows build", async () => {
      const res = await ServerFetch.get(
        "/updates/is-update-available/:version/:buildType",
        { params: { version: "0.0.1", buildType: "windows" } },
      );
      expect(res.ok).toBe(true);
      expect(typeof res.data.latestVersion).toBe("string");
    });

    it("should return a boolean for isUpdateAvailable", async () => {
      const res = await ServerFetch.get(
        "/updates/is-update-available/:version/:buildType",
        { params: { version: "999.999.999", buildType: "android" } },
      );
      expect(res.ok).toBe(true);
      expect(typeof res.data.isUpdateAvailable).toBe("boolean");
    });
  });

  describe("/updates/download/:id", () => {
    it("should return an error for a nonexistent download id", async () => {
      const res = await ServerFetch.get("/updates/download/:id", {
        params: { id: "nonexistent-id-12345" },
      });
      expect(res.data).toHaveProperty("error");
    });

    it("should handle a randomly generated download id", async () => {
      const res = await ServerFetch.get("/updates/download/:id", {
        params: { id: `fake-${Date.now()}` },
      });
      expect(res.data).toBeDefined();
    });

    it("should return a response with status information", async () => {
      const res = await ServerFetch.get("/updates/download/:id", {
        params: { id: "invalid" },
      });
      expect(res.status).toBeDefined();
    });
  });
});
