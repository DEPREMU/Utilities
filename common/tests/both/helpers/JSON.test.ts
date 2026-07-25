import { JSON } from "../../../both/helpers/JSON";
import { describe, expect, it } from "@jest/globals";

describe("JSON", () => {
  describe("parseData", () => {
    it("should parse a JSON string into an object", () => {
      const jsonString = '{"name": "John", "age": 30}';
      const result = JSON.parseData(jsonString);
      expect(result).toEqual({ name: "John", age: 30 });
    });

    it("should return null for a null input", () => {
      const result = JSON.parseData(null);
      expect(result).toBeNull();
    });

    it("should handle special placeholders for functions and symbols", () => {
      const jsonString = '{"func": "<<Function>>", "sym": "<<Symbol>>"}';
      const result = JSON.parseData<{
        func: () => void;
        sym: SymbolConstructor;
      }>(jsonString);
      expect(typeof result?.func).toBe("function");
      expect(typeof result?.sym).toBe("symbol");
    });

    it("should return the original value if parsing fails", () => {
      const invalidJsonString = '{"name": "John", "age": 30';
      const result = JSON.parseData(invalidJsonString);
      expect(result).toBe(invalidJsonString);
    });

    it("should handle nested objects with special placeholders", () => {
      const jsonString =
        '{"nested": {"func": "<<Function>>", "sym": "<<Symbol>>"}}';
      const result = JSON.parseData<{
        nested: { func: () => void; sym: SymbolConstructor };
      }>(jsonString);
      expect(typeof result?.nested.func).toBe("function");
      expect(typeof result?.nested.sym).toBe("symbol");
    });

    it("should handle arrays with special placeholders", () => {
      const jsonString = '["<<Function>>", "<<Symbol>>"]';
      const result =
        JSON.parseData<(() => void | SymbolConstructor)[]>(jsonString);
      expect(typeof result?.[0]).toBe("function");
      expect(typeof result?.[1]).toBe("symbol");
    });

    it("should handle arrays with nested objects containing special placeholders", () => {
      const jsonString = '[{"func": "<<Function>>", "sym": "<<Symbol>>"}]';
      const result =
        JSON.parseData<{ func: () => void; sym: SymbolConstructor }[]>(
          jsonString,
        );
      expect(typeof result?.[0].func).toBe("function");
      expect(typeof result?.[0].sym).toBe("symbol");
    });

    it("should handle objects with nested arrays containing special placeholders", () => {
      const jsonString = '{"nestedArray": ["<<Function>>", "<<Symbol>>"]}';
      const result = JSON.parseData<{
        nestedArray: (() => void | SymbolConstructor)[];
      }>(jsonString);
      expect(typeof result?.nestedArray[0]).toBe("function");
      expect(typeof result?.nestedArray[1]).toBe("symbol");
    });

    it("should handle complex nested structures with special placeholders", () => {
      const jsonString =
        '{"nested": {"array": ["<<Function>>", "<<Symbol>>"], "object": {"func": "<<Function>>", "sym": "<<Symbol>>"}}}';
      const result = JSON.parseData<{
        nested: {
          array: (() => void | SymbolConstructor)[];
          object: { func: () => void; sym: SymbolConstructor };
        };
      }>(jsonString);
      expect(typeof result?.nested.array[0]).toBe("function");
      expect(typeof result?.nested.array[1]).toBe("symbol");
      expect(typeof result?.nested.object.func).toBe("function");
      expect(typeof result?.nested.object.sym).toBe("symbol");
    });
  });

  describe("stringifyData", () => {
    it("should stringify an object into a JSON string and return it sorted", () => {
      const obj = { name: "John", age: 30 };
      const result = JSON.stringifyData(obj);
      expect(result).toBe('{"age":30,"name":"John"}');
    });

    it("should handle special placeholders for functions and symbols", () => {
      const obj = { func: () => {}, sym: Symbol("test") };
      const result = JSON.stringifyData(obj);
      expect(result).toBe('{"func":"<<Function>>","sym":"<<Symbol>>"}');
    });

    it("should handle nested objects with special placeholders", () => {
      const obj = { nested: { func: () => {}, sym: Symbol("test") } };
      const result = JSON.stringifyData(obj);
      expect(result).toBe(
        '{"nested":{"func":"<<Function>>","sym":"<<Symbol>>"}}',
      );
    });

    it("should handle arrays with special placeholders", () => {
      const arr = [() => {}, Symbol("test")];
      const result = JSON.stringifyData(arr);
      expect(result).toBe('["<<Function>>","<<Symbol>>"]');
    });
  });

  describe("parse and stringify data", () => {
    it("should correctly parse and stringify data with special placeholders", () => {
      const originalData = {
        func: () => {},
        sym: Symbol("test"),
        nested: {
          array: [() => {}, Symbol("nested")],
          object: { func: () => {}, sym: Symbol("object") },
        },
      };

      const stringifiedData = JSON.stringifyData(originalData);
      const parsedData = JSON.parseData<typeof originalData>(stringifiedData);

      expect(typeof parsedData?.func).toBe("function");
      expect(typeof parsedData?.sym).toBe("symbol");
      expect(typeof parsedData?.nested.array[0]).toBe("function");
      expect(typeof parsedData?.nested.array[1]).toBe("symbol");
      expect(typeof parsedData?.nested.object.func).toBe("function");
      expect(typeof parsedData?.nested.object.sym).toBe("symbol");
    });
  });
});
