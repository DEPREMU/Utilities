import { describe, expect, it } from "@jest/globals";
import { calculateExponentialBackoff } from "../../../both/helpers/backoff";

describe("calculateExponentialBackoff", () => {
  it("should return the initial delay for attempt 0 when jitter is disabled", () => {
    const delay = calculateExponentialBackoff(0, {
      initialDelay: 1000,
      jitter: 0,
    });
    expect(delay).toBe(1000);
  });

  it("should scale delay exponentially with multiplier when jitter is disabled", () => {
    const opts = {
      initialDelay: 1000,
      multiplier: 2,
      maxDelay: 30000,
      jitter: 0,
    };

    expect(calculateExponentialBackoff(0, opts)).toBe(1000);
    expect(calculateExponentialBackoff(1, opts)).toBe(2000);
    expect(calculateExponentialBackoff(2, opts)).toBe(4000);
    expect(calculateExponentialBackoff(3, opts)).toBe(8000);
  });

  it("should cap delay at maxDelay", () => {
    const opts = {
      initialDelay: 1000,
      multiplier: 2,
      maxDelay: 5000,
      jitter: 0,
    };

    expect(calculateExponentialBackoff(10, opts)).toBe(5000);
  });

  it("should handle negative attempts safely by treating them as 0", () => {
    const delay = calculateExponentialBackoff(-3, {
      initialDelay: 1200,
      jitter: 0,
    });
    expect(delay).toBe(1200);
  });

  it("should apply jitter within specified bounds", () => {
    const initialDelay = 1000;
    const jitter = 0.2;

    for (let i = 0; i < 50; i++) {
      const delay = calculateExponentialBackoff(0, {
        initialDelay,
        jitter,
      });

      expect(delay).toBeGreaterThanOrEqual(initialDelay * (1 - jitter));
      expect(delay).toBeLessThanOrEqual(initialDelay * (1 + jitter));
    }
  });

  it("should never return a value lower than initialDelay", () => {
    for (let i = 0; i < 20; i++) {
      const delay = calculateExponentialBackoff(0, {
        initialDelay: 500,
        jitter: 0.5,
      });
      expect(delay).toBeGreaterThanOrEqual(500);
    }
  });
});
