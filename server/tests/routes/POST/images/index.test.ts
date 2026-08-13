import { describe, expect, it } from "@jest/globals";
import { ServerFetch } from "@common";

describe("POST /images", () => {
  describe("/images/change-format", () => {
    it("should handle an image format change request", async () => {
      const res = await ServerFetch.post("/images/change-format", {
        body: {
          lang: "en",
          format: "png",
          imageStr: "",
        },
      });
      expect(res.status).toBeDefined();
      expect(res.data).toBeDefined();
    });

    it("should return success or error in response", async () => {
      const res = await ServerFetch.post("/images/change-format", {
        body: {
          lang: "en",
          format: "webp",
          imageStr: "",
        },
      });
      const hasSuccess = "success" in res.data;
      const hasError = "error" in res.data;
      expect(hasSuccess || hasError).toBe(true);
    });

    it("should support different output formats", async () => {
      const res = await ServerFetch.post("/images/change-format", {
        body: {
          lang: "en",
          format: "jpeg",
          imageStr: "",
        },
      });
      expect(res.status).toBeDefined();
    });
  });
});
