import { describe, expect, it } from "@jest/globals";
import { ServerFetch } from "@common";

describe("GET /info", () => {
  describe("/info/health", () => {
    it("should return server health with upTime and timestamp", async () => {
      const res = await ServerFetch.get("/info/health");
      expect(res.ok).toBe(true);
      expect(res.data).toHaveProperty("uptime");
      expect(res.data).toHaveProperty("timestamp");
      expect(res.data).toHaveProperty("uptimeString");
      expect(res.data.status).toBe("running");
    });

    it("should return a numeric upTime value", async () => {
      const res = await ServerFetch.get("/info/health");
      expect(res.ok).toBe(true);
      expect(typeof res.data.uptime).toBe("number");
    });

    it("should return a valid ISO timestamp string", async () => {
      const res = await ServerFetch.get("/info/health");
      expect(res.ok).toBe(true);
      expect(typeof res.data.timestamp).toBe("string");
      expect(new Date(res.data.timestamp).getTime()).not.toBeNaN();
    });
  });

  describe("/info/generate204", () => {
    it("should return a 204 or 200 status", async () => {
      const res = await ServerFetch.get("/info/generate204");
      expect([200, 204]).toContain(res.status);
    });

    it("should return an ok response", async () => {
      const res = await ServerFetch.get("/info/generate204");
      expect(res.ok).toBe(true);
    });

    it("should respond quickly for connectivity checks", async () => {
      const start = Date.now();
      await ServerFetch.get("/info/generate204");
      const elapsed = Date.now() - start;
      expect(elapsed).toBeLessThan(5000);
    });
  });

  describe("/info/appAlive/:deviceId/:pushToken", () => {
    it("should accept a valid deviceId and pushToken", async () => {
      const res = await ServerFetch.get("/info/appAlive/:deviceId/:pushToken", {
        params: { deviceId: "test-device-001", pushToken: "test-token-001" },
      });
      expect(res.ok).toBe(true);
    });

    it("should return a success response shape", async () => {
      const res = await ServerFetch.get("/info/appAlive/:deviceId/:pushToken", {
        params: {
          deviceId: "test-device-002",
          pushToken: "test-token-002",
        },
      });
      expect(res.data).toBeDefined();
    });

    it("should handle unique deviceId values per call", async () => {
      const res = await ServerFetch.get("/info/appAlive/:deviceId/:pushToken", {
        params: {
          deviceId: `alive-${Date.now()}`,
          pushToken: `token-${Date.now()}`,
        },
      });
      expect(res.ok).toBe(true);
    });
  });
});
