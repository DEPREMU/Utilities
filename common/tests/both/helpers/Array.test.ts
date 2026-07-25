import { Arrays } from "../../../both/helpers/Array";
import { describe, expect, it } from "@jest/globals";

describe("Arrays", () => {
  describe("convertToArray", () => {
    it("should convert a single value to an array", () => {
      const result = Arrays.convertToArray(5);
      expect(result).toEqual([5]);
    });

    it("should return the same array if an array is passed", () => {
      const result = Arrays.convertToArray([1, 2, 3]);
      expect(result).toEqual([1, 2, 3]);
    });
  });

  describe("forEachQueue", () => {
    it("should process items in the array with a limit on concurrent executions", async () => {
      const array = [1, 2, 3, 4, 5];
      const processedItems: number[] = [];
      const callback = async (item: number) => {
        await new Promise((r) => setTimeout(r, 100));
        processedItems.push(item);
      };

      await Arrays.forEachQueue(2, array, callback);
      expect(processedItems).toEqual([1, 2, 3, 4, 5]);
    });
  });
});
