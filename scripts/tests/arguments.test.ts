import { describe, it, expect, beforeEach } from "@jest/globals";
import { Args, args } from "../arguments.ts";

describe("Arguments parser", () => {
  beforeEach(() => {
    // Reset all arguments manually for testing
    Object.keys(args.ARGS).forEach((key) => {
      args.editArg(key as never, undefined as never);
    });
  });

  it("should support testing mode flag manually set", () => {
    args.editArg("testing", true);
    expect(args.ARGS.testing).toBe(true);
  });

  it("should format getArgs correctly", () => {
    args.editArg("testing", true);
    args.editArg("dev", true);
    args.editArg("PLATFORM", "android");
    args.editArg("message", "feat: patch release");

    const formatted = args.getArgs();
    expect(formatted).toContain("-t");
    expect(formatted).toContain("--dev");
    expect(formatted).toContain("--PLATFORM=android");
    expect(formatted).toContain("-m=feat: patch release");
  });

  it("should support message argument edit", () => {
    args.editArg("message", "fix: resolve critical bug");
    expect(args.ARGS.message).toBe("fix: resolve critical bug");
  });

  describe("Args.parse with spaces in message", () => {
    it("should parse --message with space-divided tokens", () => {
      const parsed = Args.parse(["--message", "feat:", "patch", "release"]);
      expect(parsed.message).toBe("feat: patch release");
    });

    it("should parse -m with space-divided tokens", () => {
      const parsed = Args.parse(["-m", "fix:", "resolve", "critical", "bug"]);
      expect(parsed.message).toBe("fix: resolve critical bug");
    });

    it("should parse --message= with space-divided tokens", () => {
      const parsed = Args.parse(["--message=feat:", "patch", "release"]);
      expect(parsed.message).toBe("feat: patch release");
    });

    it("should parse -m= with space-divided tokens", () => {
      const parsed = Args.parse(["-m=feat:", "patch", "release"]);
      expect(parsed.message).toBe("feat: patch release");
    });

    it("should parse single quoted message argument and strip quotes", () => {
      const parsed = Args.parse(['--message="feat: patch release"']);
      expect(parsed.message).toBe("feat: patch release");
    });

    it("should parse space-split quoted message tokens and strip quotes", () => {
      const parsed = Args.parse(['--message="feat:', "patch", 'release"']);
      expect(parsed.message).toBe("feat: patch release");
    });

    it("should preserve multiple equal signs in message", () => {
      const parsed = Args.parse([
        "--message=fix: calculate total=subtotal+tax",
      ]);
      expect(parsed.message).toBe("fix: calculate total=subtotal+tax");
    });

    it("should stop collecting message tokens when encountering next flag", () => {
      const parsed = Args.parse([
        "-m",
        "feat:",
        "patch",
        "release",
        "--testing",
        "--ci",
      ]);
      expect(parsed.message).toBe("feat: patch release");
      expect(parsed.testing).toBe(true);
      expect(parsed.ci).toBe(true);
    });

    it("should parse message when flags precede it", () => {
      const parsed = Args.parse([
        "--testing",
        "--platform-update-assets=android",
        "-m",
        "feat:",
        "patch",
        "release",
      ]);
      expect(parsed.testing).toBe(true);
      expect(parsed["platform-update-assets"]).toBe("android");
      expect(parsed.message).toBe("feat: patch release");
    });

    it("should throw error on duplicate message argument", () => {
      expect(() => {
        Args.parse(["-m", "first", "--message", "second"]);
      }).toThrow("Duplicate argument");
    });
  });
});
