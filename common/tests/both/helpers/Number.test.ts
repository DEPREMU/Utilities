import { Numbers } from "../../../both/helpers/Number";
import { it, describe, expect } from "@jest/globals";

describe("Number", () => {
  describe("Test randInt", () => {
    it("should get a number between 1 and 100", () => {
      const rand = Numbers.randInt(1, 100);
      expect(rand).toBeGreaterThanOrEqual(1);
      expect(rand).toBeLessThanOrEqual(100);
    });

    it("should get a number between 1 and 2", () => {
      const rand = Numbers.randInt(1, 2);
      expect(rand).toBeGreaterThanOrEqual(1);
      expect(rand).toBeLessThanOrEqual(2);
    });

    it("should get always a number between 1 and 10 during 1000 loops", () => {
      let loop = 1000;
      while (loop-- > 0) {
        const rand = Numbers.randInt(1, 10);
        expect(rand).toBeGreaterThanOrEqual(1);
        expect(rand).toBeLessThanOrEqual(10);
      }
    });
  });
});
