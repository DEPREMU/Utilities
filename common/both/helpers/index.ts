import { JSON } from "./JSON.ts";
import { Object } from "./Object.ts";

export class Helper {
  static readonly getMessage = (...args: unknown[]) => {
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

  static readonly Object = Object;

  static readonly JSON = JSON;
}
