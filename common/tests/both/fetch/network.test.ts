import { Network } from "../../../both/fetch/network";
import { describe, expect, it } from "@jest/globals";

describe("Network", () => {
  it("isOnline should return a boolean", async () => {
    const result = await Network.isOnline();
    expect(typeof result).toBe("boolean");
  });

  it("isOnlineUrl should return a boolean for a valid URL", async () => {
    const result = await Network.isOnlineUrl("https://www.google.com");
    expect(typeof result).toBe("boolean");
  });

  it("isOnlineUrl should return false for an invalid URL", async () => {
    const result = await Network.isOnlineUrl("https://invalid.url");
    expect(result).toBe(false);
  });

  it("isOnlineUrl should return false for a URL that times out", async () => {
    const result = await Network.isOnlineUrl(
      "https://www.google.com",
      "get",
      1,
    );
    expect(result).toBe(false);
  });

  it("isOnlineUrl should return false for a URL that returns an error status code", async () => {
    const result = await Network.isOnlineUrl("https://www.google.com/404");
    expect(result).toBe(false);
  });

  it("isOnlineUrl should return true for a URL that returns a success status code", async () => {
    const result = await Network.isOnlineUrl("https://www.google.com");
    expect(result).toBe(true);
  });

  it("waitForOnline should return true if the network is online", async () => {
    const result = await Network.waitForOnline(3, 1000);
    expect(result).toBe(true);
  });
});
