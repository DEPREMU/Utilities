import { describe, expect, it } from "@jest/globals";
import { detectLanguageFromJid, getBotMessage } from "../../whatsapp/language";
import { getUtcDateKey, getSecondsUntilMidnightUtc } from "../../whatsapp/rateLimiter";

describe("WhatsApp Language Detection and Quota Utilities", () => {
  it("should accurately detect Spanish country calling prefixes", () => {
    expect(detectLanguageFromJid("34612345678@s.whatsapp.net")).toBe("es");
    expect(detectLanguageFromJid("5215512345678@s.whatsapp.net")).toBe("es");
    expect(detectLanguageFromJid("5491123456789@s.whatsapp.net")).toBe("es");
    expect(detectLanguageFromJid("573001234567@s.whatsapp.net")).toBe("es");
  });

  it("should default non-Spanish numbers to English", () => {
    expect(detectLanguageFromJid("14155552671@s.whatsapp.net")).toBe("en");
    expect(detectLanguageFromJid("447911123456@s.whatsapp.net")).toBe("en");
    expect(detectLanguageFromJid("4915123456789@s.whatsapp.net")).toBe("en");
    expect(detectLanguageFromJid("819012345678@s.whatsapp.net")).toBe("en");
  });

  it("should retrieve localized bot responses according to language", () => {
    const spanishQuota = getBotMessage("quotaExceeded", "es");
    const englishQuota = getBotMessage("quotaExceeded", "en");

    expect(spanishQuota).toBeTruthy();
    expect(englishQuota).toBeTruthy();
    expect(spanishQuota).not.toBe(englishQuota);

    const spanishLink = getBotMessage("linkSuccess", "es");
    const englishLink = getBotMessage("linkSuccess", "en");
    expect(spanishLink).toBeTruthy();
    expect(englishLink).toBeTruthy();
    expect(spanishLink).not.toBe(englishLink);
  });

  it("should correctly generate UTC calendar date keys and midnight countdowns", () => {
    const dateKey = getUtcDateKey();
    expect(dateKey).toMatch(/^\d{4}-\d{2}-\d{2}$/);

    const secondsUntilMidnight = getSecondsUntilMidnightUtc();
    expect(secondsUntilMidnight).toBeGreaterThan(0);
    expect(secondsUntilMidnight).toBeLessThanOrEqual(86400);
  });
});
