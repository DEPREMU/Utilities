import { Objects } from "../../../both/helpers/Object";
import { describe, expect, it } from "@jest/globals";

describe("Objects", () => {
  describe("removeProperties", () => {
    it("should remove specified properties from an object", () => {
      const obj = { a: 1, b: 2, c: 3 };
      const result = Objects.removeProperties(obj, "b", "c");
      expect(result).toEqual({ a: 1 });
    });

    it("should return the original object if no properties are specified", () => {
      const obj = { a: 1, b: 2, c: 3 };
      const result = Objects.removeProperties(obj);
      expect(result).toEqual(obj);
    });

    it("should handle nested objects and remove specified properties", () => {
      const obj = { a: 1, b: { c: 2, d: 3 }, e: 4 };
      const result = Objects.removeProperties(obj, "b", "e");
      expect(result).toEqual({ a: 1 });
    });

    it("should handle arrays and remove specified properties", () => {
      const obj = { a: 1, b: [2, 3, 4], c: 5 };
      const result = Objects.removeProperties(obj, "b");
      expect(result).toEqual({ a: 1, c: 5 });
    });

    it("should handle properties that do not exist in the object", () => {
      const obj = { a: 1, b: 2, c: 3 };
      const result = Objects.removeProperties(obj, "d" as "a", "e" as "b");
      expect(result).toEqual(obj);
    });

    it("should handle objects with null values", () => {
      const obj = { a: 1, b: null, c: 3 };
      const result = Objects.removeProperties(obj, "b");
      expect(result).toEqual({ a: 1, c: 3 });
    });
  });

  describe("changeType", () => {
    it("should change the type of properties in an object", () => {
      const obj = { a: 1, b: 2, c: 3 };
      const result = Objects.changeType(obj, {
        a: "string",
        b: "string",
        c: "string",
      });
      expect(result).toEqual({ a: "1", b: "2", c: "3" });
    });

    it("should handle nested objects and change the type of properties", () => {
      const obj = { a: 1, b: { c: 2, d: 3 }, e: 4 };
      const result = Objects.changeType(obj, {
        a: "string",
        b: "object",
        e: "string",
      });

      expect(result).toEqual({ a: "1", b: { c: 2, d: 3 }, e: "4" });
    });

    it("should handle properties that do not exist in the object", () => {
      const obj = { a: 1, b: 2, c: 3 };
      const result = Objects.changeType(obj, {
        ["d" as "a"]: "string",
        e: "string",
      });
      expect(result).toEqual(obj);
    });

    it("should handle objects with null values", () => {
      const obj = { a: 1, b: null, c: 3 };
      const result = Objects.changeType(obj, {
        a: "string",
        b: "string",
        c: "string",
      });
      expect(result).toEqual({ a: "1", b: "null", c: "3" });
    });

    it("should handle nested objects with null values", () => {
      const obj = { a: 1, b: { c: null, d: 3 }, e: 4 };
      const result = Objects.changeType(obj, {
        a: "string",
        b: "object",
        e: "string",
      });
      expect(result).toEqual({ a: "1", b: { c: null, d: 3 }, e: "4" });
    });

    it("should delete properties with undefined type", () => {
      const obj = { a: 1, b: 2, c: 3 };
      const result = Objects.changeType(obj, {
        a: "undefined",
        b: "string",
        c: "string",
      });
      expect(result).toEqual({ b: "2", c: "3" });
    });

    it("should handle nested objects with undefined type", () => {
      const obj = { a: 1, b: { c: 2, d: 3 }, e: 4 };
      const result = Objects.changeType(obj, {
        a: "string",
        b: "undefined",
        e: "string",
      });
      expect(result).toEqual({ a: "1", e: "4" });
    });

    it("should handle properties with mixed types", () => {
      const obj = { a: 1, b: "2", c: true, d: null };
      const result = Objects.changeType(obj, {
        a: "string",
        b: "number",
        c: "string",
        d: "string",
      });
      expect(result).toEqual({ a: "1", b: 2, c: "true", d: "null" });
    });

    it("should handle properties with mixed types and nested objects", () => {
      const obj = { a: 1, b: "2", c: true, d: { e: 3, f: "4" } };
      const result = Objects.changeType(obj, {
        a: "string",
        b: "number",
        c: "string",
        d: "object",
      });
      expect(result).toEqual({ a: "1", b: 2, c: "true", d: { e: 3, f: "4" } });
    });

    it("should handle properties with mixed types and nested objects with null values", () => {
      const obj = { a: 1, b: "2", c: true, d: { e: null, f: "4" } };
      const result = Objects.changeType(obj, {
        a: "string",
        b: "number",
        c: "string",
        d: "object",
      });
      expect(result).toEqual({
        a: "1",
        b: 2,
        c: "true",
        d: { e: null, f: "4" },
      });
    });

    it("should handle properties with mixed types and nested objects with undefined values", () => {
      const obj = { a: 1, b: "2", c: true, d: { e: undefined, f: "4" } };
      const result = Objects.changeType(obj, {
        a: "string",
        b: "number",
        c: "string",
        d: "object",
      });
      expect(result).toEqual({
        a: "1",
        b: 2,
        c: "true",
        d: { e: undefined, f: "4" },
      });
    });

    it("should handle properties with mixed types and nested objects with undefined values and delete them", () => {
      const obj = { a: 1, b: "2", c: true, d: { e: undefined, f: "4" } };
      const result = Objects.changeType(obj, {
        a: "string",
        b: "number",
        c: "string",
        d: "object",
      });
      expect(result).toEqual({
        a: "1",
        b: 2,
        c: "true",
        d: { f: "4" },
      });
    });

    it("should transform Date objects to their ISO string representation when changing type to string", () => {
      const value = "2024-01-01T00:00:00.000Z";
      const date = new Date(value);

      const obj = { date };
      const result = Objects.changeType(obj, { date: "string" });
      expect(result).toEqual({ date: value });
    });

    it("should transform Date objects to their timestamp representation when changing type to number", () => {
      const date = new Date("2024-01-01T00:00:00Z");

      const obj = { date: date };
      const result = Objects.changeType(obj, { date: "number" });
      expect(result).toEqual({ date: date.getTime() });
    });

    it("should transform Date objects to their boolean representation when changing type to boolean", () => {
      const date = new Date("2024-01-01T00:00:00Z");

      const obj = { date };

      const result = Objects.changeType(obj, { date: "boolean" });
      expect(result).toEqual({ date: true });
    });

    it("should transform Date objects to their boolean representation when changing type to boolean and the date is invalid", () => {
      const date = new Date("invalid date");

      const obj = { date };

      const result = Objects.changeType(obj, { date: "boolean" });
      expect(result).toEqual({ date: false });
    });
  });
});
