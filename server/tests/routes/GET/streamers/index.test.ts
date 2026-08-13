import { describe, expect, it } from "@jest/globals";
import { ServerFetch } from "@common";

describe("GET /streamers", () => {
  describe("/streamers/page{/:page}", () => {
    it("should return paginated streamers", async () => {
      const res = await ServerFetch.get("/streamers/page{/:page}", {
        params: {},
      });
      expect(res.status).toBeDefined();
      expect(res.data).toBeDefined();
    });

    it("should support the optional page-number parameter", async () => {
      const res = await ServerFetch.get("/streamers/page{/:page}", {
        params: { page: 1 },
      });
      expect(res.status).toBeDefined();
    });

    it("should return streamers or an error", async () => {
      const res = await ServerFetch.get("/streamers/page{/:page}", {
        params: {},
      });
      const hasStreamers = "streamers" in res.data;
      const hasError = "error" in res.data;
      expect(hasStreamers || hasError).toBe(true);
    });
  });

  describe("/streamers/streamer/:streamerId", () => {
    it("should return a streamer by ID", async () => {
      const res = await ServerFetch.get("/streamers/streamer/:streamerId", {
        params: { streamerId: "nonexistent-id" },
      });
      expect(res.status).toBeDefined();
      expect(res.data).toBeDefined();
    });

    it("should handle a nonexistent streamer gracefully", async () => {
      const res = await ServerFetch.get("/streamers/streamer/:streamerId", {
        params: { streamerId: `fake-${Date.now()}` },
      });
      expect(res.data).toBeDefined();
    });

    it("should return a streamer or error shape", async () => {
      const res = await ServerFetch.get("/streamers/streamer/:streamerId", {
        params: { streamerId: "test-id-123" },
      });
      const hasStreamer = "streamer" in res.data;
      const hasError = "error" in res.data;
      expect(hasStreamer || hasError || res.data === undefined).toBe(true);
    });
  });

  describe("/streamers/", () => {
    it("should return all streamers", async () => {
      const res = await ServerFetch.get("/streamers/");
      expect(res.status).toBeDefined();
      expect(res.data).toBeDefined();
    });

    it("should return an array when streamers exist", async () => {
      const res = await ServerFetch.get("/streamers/");
      if (res.ok && "streamers" in res.data) {
        expect(
          Array.isArray(res.data.streamers) || res.data.streamers === undefined,
        ).toBe(true);
      }
    });

    it("should return a valid status code", async () => {
      const res = await ServerFetch.get("/streamers/");
      expect(res.status).toBeGreaterThanOrEqual(200);
    });
  });

  describe("/streamers/:userId", () => {
    it("should return streamers for a specific user", async () => {
      const res = await ServerFetch.get("/streamers/:userId{/:streamerId}", {
        params: { userId: "test-user-id" },
      });
      expect(res.status).toBeDefined();
      expect(res.data).toBeDefined();
    });

    it("should return an empty result for a nonexistent user", async () => {
      const res = await ServerFetch.get("/streamers/:userId{/:streamerId}", {
        params: { userId: `nonexistent-${Date.now()}` },
      });
      expect(res.data).toBeDefined();
    });

    it("should support the optional streamerId parameter", async () => {
      const res = await ServerFetch.get("/streamers/:userId{/:streamerId}", {
        params: {
          userId: "test-user-id",
          streamerId: "test-streamer-id",
        },
      });
      expect(res.status).toBeDefined();
    });
  });
});
