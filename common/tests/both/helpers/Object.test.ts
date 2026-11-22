import { Objects } from "../../../both/helpers/Object";
import { describe, expect, it } from "@jest/globals";

describe("Objects", () => {
  describe("removeProperties", () => {
    it("should remove specified properties from an object", () => {
      const obj = { a: 1, b: 2, c: 3 };
      const result = Objects.removeProperties(obj, "b", "c");
      expect(result).toEqual({ a: 1 });
    });

    it("should remove nested properties from an object", () => {
      const obj = { a: 1, b: { c: 2, d: 3 } };
      const result = Objects.removeProperties(obj, "b.c");
      expect(result).toEqual({ a: 1, b: { d: 3 } });
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

  describe("getValue", () => {
    it("should get the path of an object that has an array and a object", () => {
      const obj = { c: 0, a: { b: [Math.random()] } } as
        { a: number; b: { c: number } } | { c: number; a: { b: [number] } };

      expect(Objects.getValue(obj, "a.b.0")).toBe(
        (obj.a as Record<string, number[]>).b[0],
      );
    });

    it("should get the path of an object", () => {
      const obj = { a: 0, b: { c: Math.random() } } as
        { a: number; b: { c: number } } | { c: number; a: { b: [number] } };

      expect(Objects.getValue(obj, "b.c")).toBe(
        (obj as Exclude<typeof obj, { c: number }>).b.c,
      );
    });

    it("should get a top-level property value", () => {
      const obj = { a: 1, b: "two" };
      expect(Objects.getValue(obj, "a")).toBe(1);
      expect(Objects.getValue(obj, "b")).toBe("two");
    });

    it("should get a deeply nested property value", () => {
      const obj = { a: { b: { c: 42 } } };
      expect(Objects.getValue(obj, "a.b.c")).toBe(42);
    });

    it("should get a value from an array using path notation", () => {
      const obj = { items: [{ name: "first" }, { name: "second" }] } as const;
      expect(Objects.getValue(obj, "items.1.name")).toBe("second");
    });

    it("should return undefined when the path does not exist", () => {
      const obj = { a: { b: 1 } };
      expect(Objects.getValue(obj, "a.c" as "a")).toBeUndefined();
    });

    it("should return the default value when the path resolves to undefined", () => {
      const obj = { a: { b: undefined as string | undefined } };
      expect(Objects.getValue(obj, "a.b", "fallback")).toBe("fallback");
      expect(Objects.getValue(obj, "a.missing" as "a", 123 as never)).toBe(123);
    });
  });

  describe("setValue", () => {
    it("should set a top-level property value and return the object", () => {
      const obj = { a: 1, b: 2 };
      const result = Objects.setValue(obj, "a", 10);
      expect(result).toBe(obj);
      expect(result).toEqual({ a: 10, b: 2 });
    });

    it("should set a deeply nested property value", () => {
      const obj = { a: { b: { c: "old" } } };
      const result = Objects.setValue(obj, "a.b.c", "new");
      expect(result).toEqual({ a: { b: { c: "new" } } });
    });

    it("should set an array property value", () => {
      const obj = { items: [{ count: 1 }, { count: 2 }] };
      const result = Objects.setValue(obj, "items", [{ count: 99 }]);
      expect(result).toEqual({ items: [{ count: 99 }] });
    });

    it("should create intermediate objects when setting a missing nested path", () => {
      const obj: { a?: { b?: { c?: number } } } = {};
      const result = Objects.setValue(obj, "a.b.c", 5);
      expect(result).toEqual({ a: { b: { c: 5 } } });
    });
  });

  describe("fromEntries", () => {
    it("should create an object from key-value entry pairs", () => {
      const entries = [
        ["a", 1],
        ["b", "two"],
        ["c", true],
      ] as const;
      const result = Objects.fromEntries(entries);
      expect(result).toEqual({ a: 1, b: "two", c: true });
    });

    it("should return an empty object for an empty array", () => {
      const result = Objects.fromEntries([] as const);
      expect(result).toEqual({});
    });

    it("should overwrite duplicate keys with the later entry", () => {
      const entries = [
        ["a", 1],
        ["b", 2],
        ["a", 3],
      ] as const;
      const result = Objects.fromEntries(entries);
      expect(result).toEqual({ a: 3, b: 2 });
    });
  });

  describe("entries", () => {
    it("should return an array of key-value pairs for an object", () => {
      const obj = { a: 1, b: "two", c: true };
      expect(Objects.entries(obj)).toEqual([
        ["a", 1],
        ["b", "two"],
        ["c", true],
      ]);
    });

    it("should return an empty array for an empty object", () => {
      expect(Objects.entries({})).toEqual([]);
    });

    it("should only include own enumerable properties", () => {
      const obj = { visible: 1 };
      Object.defineProperty(obj, "hidden", {
        value: 2,
        enumerable: false,
      });
      expect(Objects.entries(obj)).toEqual([["visible", 1]]);
    });
  });

  describe("values", () => {
    it("should return an array of property values", () => {
      const obj = { a: 1, b: "two", c: false };
      expect(Objects.values(obj)).toEqual([1, "two", false]);
    });

    it("should return an empty array for an empty object", () => {
      expect(Objects.values({})).toEqual([]);
    });

    it("should preserve references for nested objects", () => {
      const nested = { x: 1 };
      const obj = { nested };
      const values = Objects.values(obj);
      expect(values).toEqual([nested]);
      expect(values[0]).toBe(nested);
    });
  });

  describe("keys", () => {
    it("should return an array of own enumerable property names", () => {
      const obj = { a: 1, b: 2, c: 3 };
      expect(Objects.keys(obj)).toEqual(["a", "b", "c"]);
    });

    it("should return an empty array for an empty object", () => {
      expect(Objects.keys({})).toEqual([]);
    });

    it("should ignore non-enumerable properties", () => {
      const obj = { a: 1 };
      Object.defineProperty(obj, "hidden", {
        value: 2,
        enumerable: false,
      });
      expect(Objects.keys(obj)).toEqual(["a"]);
    });
  });

  describe("merge", () => {
    it("should deeply merge partial values into the target object", () => {
      const target = { a: 1, nested: { b: 2, c: 3 } };
      const result = Objects.merge(target, { nested: { c: 30 } });
      expect(result).toBe(target);
      expect(result).toEqual({ a: 1, nested: { b: 2, c: 30 } });
    });

    it("should overwrite primitive values with provided values", () => {
      const target = { a: 1, b: "old" };
      const result = Objects.merge(target, { a: 2, b: "new" });
      expect(result).toEqual({ a: 2, b: "new" });
    });

    it("should not overwrite existing defined properties with undefined", () => {
      const target = { a: 1, b: "keep" };
      const result = Objects.merge(target, { a: undefined });
      expect(result).toEqual({ a: 1, b: "keep" });
    });
  });

  describe("isEqualObj", () => {
    it("should return true for plain objects with the same structure regardless of leaf values", () => {
      const obj1 = { a: 1, b: { c: "hello", d: [1, 2] } };
      const obj2 = { a: 999, b: { c: "world", d: [3, 4, 5] } };
      expect(Objects.isEqualObj(obj1, obj2)).toBe(true);
    });

    it("should return true for two empty plain objects", () => {
      expect(Objects.isEqualObj({}, {})).toBe(true);
    });

    it("should return false when objects have different keys", () => {
      const obj1 = { a: 1, b: 2 };
      const obj2 = { a: 1, c: 2 };
      expect(Objects.isEqualObj(obj1, obj2)).toBe(false);
    });

    it("should return false when one property is a plain object and the other is a primitive", () => {
      const obj1 = { a: 1, b: { c: 2 } };
      const obj2 = { a: 1, b: 2 };
      expect(Objects.isEqualObj(obj1, obj2)).toBe(false);
    });

    it("should return false when compared against non-plain-object values", () => {
      const obj = { a: 1 };
      expect(Objects.isEqualObj(obj, null)).toBe(false);
      expect(Objects.isEqualObj(obj, [1, 2])).toBe(false);
      expect(Objects.isEqualObj(obj, "string")).toBe(false);
      expect(Objects.isEqualObj(obj, undefined)).toBe(false);
    });
  });
});
