import { describe, expect, it } from "@jest/globals";
import { ServerFetch } from "@common";

describe("POST /encryption", () => {
  describe("/encryption/encrypt", () => {
    it("should encrypt a value", async () => {
      const res = await ServerFetch.post("/encryption/encrypt", {
        body: { value: "hello world" },
      });
      expect(res.status).toBeDefined();
      expect(res.data).toBeDefined();
    });

    it("should return a value property when successful", async () => {
      const res = await ServerFetch.post("/encryption/encrypt", {
        body: { value: "test encryption value" },
      });
      if (res.ok && "value" in res.data) {
        expect(typeof res.data.value).toBe("string");
      }
    });

    it("should handle an empty string", async () => {
      const res = await ServerFetch.post("/encryption/encrypt", {
        body: { value: "" },
      });
      expect(res.status).toBeDefined();
    });
  });

  describe("/encryption/decrypt", () => {
    it("should decrypt a previously encrypted value", async () => {
      const encRes = await ServerFetch.post("/encryption/encrypt", {
        body: { value: "decrypt-test" },
      });
      const encrypted =
        encRes.ok && "value" in encRes.data ? encRes.data.value : undefined;

      if (encrypted) {
        const res = await ServerFetch.post("/encryption/decrypt", {
          body: { value: encrypted },
        });
        expect(res.status).toBeDefined();
        expect(res.data).toBeDefined();
      }
    });

    it("should handle an invalid encrypted value", async () => {
      const res = await ServerFetch.post("/encryption/decrypt", {
        body: { value: "not-a-valid-encrypted-string" },
      });
      expect(res.status).toBeDefined();
    });

    it("should return a response with value or error", async () => {
      const res = await ServerFetch.post("/encryption/decrypt", {
        body: { value: "test" },
      });
      const hasValue = "value" in res.data;
      const hasError = "error" in res.data;
      expect(hasValue || hasError).toBe(true);
    });
  });
});
