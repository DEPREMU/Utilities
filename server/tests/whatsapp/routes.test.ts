import { describe, expect, it } from "@jest/globals";
import { ServerFetch } from "@common";

describe("WhatsApp HTTP Route Contract Tests", () => {
  describe("GET /whatsapp/health", () => {
    it("should return the health response payload matching the contract", async () => {
      const res = await ServerFetch.get("/whatsapp/health");

      expect([200, 503]).toContain(res.status);
      expect(res.data).toBeDefined();

      if (res.data && !("error" in res.data)) {
        expect(["healthy", "degraded"]).toContain(res.data.status);
        expect(res.data.gateway).toBeDefined();
        expect(typeof res.data.gateway.connected).toBe("boolean");
        expect(["open", "close", "connecting"]).toContain(res.data.gateway.state);
        expect(typeof res.data.gateway.uptimeSeconds).toBe("number");

        expect(res.data.redis).toBeDefined();
        expect(typeof res.data.redis.connected).toBe("boolean");

        expect(res.data.queues).toBeDefined();
        expect(typeof res.data.queues.processQueueHealthy).toBe("boolean");
        expect(typeof res.data.queues.deliveryQueueHealthy).toBe("boolean");

        expect(typeof res.data.timestamp).toBe("string");
        expect(new Date(res.data.timestamp).getTime()).not.toBeNaN();
      }
    });
  });
});
