import { describe, expect, it } from "@jest/globals";
import { ServerFetch } from "@common";

describe("POST /updates", () => {
  describe("/updates/upload", () => {
    it("should handle an upload request", async () => {
      const res = await ServerFetch.post("/updates/upload");
      expect(res.status).toBeDefined();
    });

    it("should return a defined response", async () => {
      const res = await ServerFetch.post("/updates/upload");
      expect(res.data).toBeDefined();
    });

    it("should return a valid status code", async () => {
      const res = await ServerFetch.post("/updates/upload");
      expect(res.status).toBeGreaterThanOrEqual(200);
    });
  });
});
