import { JSON } from "./JSON";
import { Arrays } from "./Array";
import { Objects } from "./Object";
import { REPLACERS } from "@REPLACERS";

export * from "./backoff";

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

  static secret(value: unknown): string {
    if (value === null || value === undefined) {
      return REPLACERS.isDev ? "" : "***";
    }

    let str: string;
    try {
      str =
        value instanceof Error
          ? value.message
          : typeof value === "object"
            ? JSON.stringify(value)
            : String(value);
    } catch {
      str = String(value);
    }

    if (REPLACERS.isDev) return str;

    if (!str) return "***";

    const len = str.length;

    if (len < 2) return "***";
    if (len === 2) return `${str[0]}***`;
    if (len === 3) return `${str.slice(0, 2)}***`;
    if (len <= 6) return `${str.slice(0, 3)}***`;

    return `${str.slice(0, 3)}***${str.slice(-3)}`;
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
