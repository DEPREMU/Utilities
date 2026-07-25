import { getDateWithTimeAhead } from "../../both/unknown";
import { it, expect, describe } from "@jest/globals";

describe("getDateWithTimeAhead", () => {
  it("should return the current date when no options are provided", () => {
    const now = new Date();
    const result = getDateWithTimeAhead({});
    expect(result.getTime()).toBeCloseTo(now.getTime(), -1);
  });

  it("should add the specified number of days", () => {
    const now = new Date();
    const result = getDateWithTimeAhead({ days: 1 });
    expect(result.getTime()).toBeCloseTo(
      now.getTime() + 24 * 60 * 60 * 1000,
      -1,
    );
  });

  it("should add the specified number of hours", () => {
    const now = new Date();
    const result = getDateWithTimeAhead({ hours: 1 });
    expect(result.getTime()).toBeCloseTo(now.getTime() + 60 * 60 * 1000, -1);
  });

  it("should add the specified number of minutes", () => {
    const now = new Date();
    const result = getDateWithTimeAhead({ minutes: 1 });
    expect(result.getTime()).toBeCloseTo(now.getTime() + 60 * 1000, -1);
  });

  it("should add the specified number of seconds", () => {
    const now = new Date();
    const result = getDateWithTimeAhead({ seconds: 1 });
    expect(result.getTime()).toBeCloseTo(now.getTime() + 1000, -1);
  });
});
