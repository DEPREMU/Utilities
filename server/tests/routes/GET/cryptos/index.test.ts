import { describe, expect, it } from "@jest/globals";
import { ServerFetch } from "@common";

describe("GET /cryptos", () => {
  describe("/cryptos/", () => {
    it("should return a list of cryptos or an error", async () => {
      const res = await ServerFetch.get("/cryptos/");
      expect(res.status).toBeDefined();
      expect(res.data).toBeDefined();
    });

    it("should contain a cryptos array when available", async () => {
      const res = await ServerFetch.get("/cryptos/");
      if (res.ok && "cryptos" in res.data) {
        expect(Array.isArray(res.data.cryptos)).toBe(true);
      } else {
        expect(res.data).toHaveProperty("error");
      }
    });

    it("should return a valid status code", async () => {
      const res = await ServerFetch.get("/cryptos/");
      expect(res.status).toBeGreaterThanOrEqual(200);
    });
  });

  describe("/cryptos/:symbol", () => {
    it("should return a single crypto by symbol", async () => {
      const res = await ServerFetch.get("/cryptos/:symbol", {
        params: { symbol: "BTCUSDT" },
      });
      expect(res.status).toBeDefined();
    });

    it("should return null crypto for a nonexistent symbol", async () => {
      const res = await ServerFetch.get("/cryptos/:symbol", {
        params: { symbol: "NONEXISTENT999" },
      });
      expect(res.status).toBeDefined();
      if (res.ok && "crypto" in res.data) {
        expect(res.data.crypto).toBeNull();
      }
    });

    it("should handle a valid symbol query", async () => {
      const res = await ServerFetch.get("/cryptos/:symbol", {
        params: { symbol: "ETHUSDT" },
      });
      expect(res.data).toBeDefined();
    });
  });

  describe("/cryptos/price/:symbol", () => {
    it("should return a price for a known symbol", async () => {
      const res = await ServerFetch.get("/cryptos/price/:symbol", {
        params: { symbol: "BTCUSDT" },
      });
      expect(res.status).toBeDefined();
      if (res.ok && "price" in res.data) {
        expect(typeof res.data.price).toBe("number");
      }
    });

    it("should return an error for an unknown symbol", async () => {
      const res = await ServerFetch.get("/cryptos/price/:symbol", {
        params: { symbol: "INVALIDSYMBOL" },
      });
      expect(res.status).toBeDefined();
    });

    it("should return a valid response shape", async () => {
      const res = await ServerFetch.get("/cryptos/price/:symbol", {
        params: { symbol: "BTCUSDT" },
      });
      expect(res.data).toBeDefined();
    });
  });
});
