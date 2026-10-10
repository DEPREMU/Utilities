import { JSON } from "./JSON.ts";
import { Arrays } from "./Array.ts";
import { Objects } from "./Object.ts";

export class Helper {
  static getMessage(...args: unknown[]) {
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
  }

  /**
   * Strips ANSI escape sequences from a string.
   *
   * @param str - The string containing potential ANSI escape sequences.
   * @returns The sanitized plain-text string.
   */
  static stripAnsi(str: string): string {
    return str.replace(
      // eslint-disable-next-line no-control-regex
      /[\u001b\u009b][[()#;?]*(?:[0-9]{1,4}(?:;[0-9]{0,4})*)?[0-9A-ORZcf-nqry=><]/g,
      "",
    );
  }

  static readonly JSON = JSON;

  static readonly Arrays = Arrays;

  static readonly Object = Objects;
}
