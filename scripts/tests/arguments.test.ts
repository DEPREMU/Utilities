import { describe, it, expect, beforeEach } from '@jest/globals';
import { args } from "../arguments.ts";

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

    const formatted = args.getArgs();
    expect(formatted).toContain("-t");
    expect(formatted).toContain("--dev");
    expect(formatted).toContain("--PLATFORM=android");
  });
});
