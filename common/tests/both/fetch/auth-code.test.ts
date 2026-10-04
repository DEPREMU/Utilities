import { ServerFetch } from "../../../both/fetch/fetch";
import { describe, expect, it } from "@jest/globals";

describe("Passwordless Auth Routes & Fetch Contracts", () => {
  it("should have correct route mapping for /auth/request-code", () => {
    const route = ServerFetch.getRoute("POST", "/auth/request-code");
    expect(route).toContain("/auth/request-code");
  });

  it("should have correct route mapping for /auth/verify-code", () => {
    const route = ServerFetch.getRoute("POST", "/auth/verify-code");
    expect(route).toContain("/auth/verify-code");
  });

  it("should have ServerFetch.post defined for auth requests", () => {
    expect(ServerFetch.post).toBeDefined();
    expect(typeof ServerFetch.post).toBe("function");
  });
});
