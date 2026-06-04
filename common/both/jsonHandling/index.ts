export * from "./parse.ts";
export * from "./stringify.ts";

export const getMessage = (...args: unknown[]) => {
  return args
    .map((arg) => {
      try {
        if (arg instanceof Error) return arg.message;
        else if (typeof arg === "object" && arg !== null)
          return JSON.stringify(arg, null, 2);
        else if (typeof arg === "function")
          return arg.name || arg.toString() || "<unknown function>";
        else if (typeof arg === "symbol")
          return arg.toString() || "<unknown symbol>";
      } catch {
        // Ignore errors
      }

      return String(arg);
    })
    .join(" ");
};