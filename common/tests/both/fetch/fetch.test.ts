import { ServerFetch } from "../../../both/fetch/fetch";
import { describe, expect, it } from "@jest/globals";

describe("ServerFetch", () => {
  it("should have a post method", () => {
    expect(ServerFetch.post).toBeDefined();
  });

  it("should have a delete method", () => {
    expect(ServerFetch.delete).toBeDefined();
  });

  it("should have a put method", () => {
    expect(ServerFetch.put).toBeDefined();
  });

  it("should have a server method", () => {
    expect(ServerFetch.server).toBeDefined();
  });

  it("should have a getRoute method", () => {
    expect(ServerFetch.getRoute).toBeDefined();
  });

  it("should have a getValidRoute method", () => {
    expect(ServerFetch.getValidRoute).toBeDefined();
  });
});
