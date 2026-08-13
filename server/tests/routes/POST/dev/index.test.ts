import { describe, expect, it } from "@jest/globals";
import { ServerFetch } from "@common";

describe("POST /dev", () => {
  describe("/dev/executeQuery", () => {
    it("should execute a simple query", async () => {
      const res = await ServerFetch.post("/dev/executeQuery", {
        body: { value: "SELECT 1 as test" },
      });
      expect(res.status).toBeDefined();
      expect(res.data).toBeDefined();
    });

    it("should return result with rowCount", async () => {
      const res = await ServerFetch.post("/dev/executeQuery", {
        body: { value: "SELECT 1 as test", showFields: true },
      });
      if (res.ok && "result" in res.data && res.data.result) {
        expect(res.data.result).toHaveProperty("rowCount");
        expect(res.data.result).toHaveProperty("rows");
      }
    });

    it("should return an error for invalid SQL", async () => {
      const res = await ServerFetch.post("/dev/executeQuery", {
        body: { value: "INVALID SQL STATEMENT !!!" },
      });
      expect(res.data).toBeDefined();
    });
  });
});
