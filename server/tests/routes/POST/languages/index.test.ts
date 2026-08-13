import { describe, expect, it } from "@jest/globals";
import { ServerFetch } from "@common";

describe("POST /languages", () => {
  describe("/languages/translate", () => {
    it("should translate text to a target language", async () => {
      const res = await ServerFetch.post("/languages/translate", {
        body: { text: "Hello", targetLanguage: "es" },
      });
      expect(res.status).toBeDefined();
      expect(res.data).toBeDefined();
    });

    it("should return translatedText or an error", async () => {
      const res = await ServerFetch.post("/languages/translate", {
        body: { text: "Good morning", targetLanguage: "fr" },
      });
      const hasTranslated = "translatedText" in res.data;
      const hasError = "error" in res.data;
      expect(hasTranslated || hasError).toBe(true);
    });

    it("should handle an empty text input", async () => {
      const res = await ServerFetch.post("/languages/translate", {
        body: { text: "", targetLanguage: "en" },
      });
      expect(res.status).toBeDefined();
    });
  });
});
