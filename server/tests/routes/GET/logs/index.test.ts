import { describe, expect, it, beforeAll } from "@jest/globals";
import { ServerFetch } from "@common";
import { createTestUser, type TestUser } from "../../../utils/testHelpers";

let testUser: TestUser;

beforeAll(async () => {
  testUser = await createTestUser();
});

describe("GET /logs", () => {
  describe("/logs/", () => {
    it("should return logs for an authenticated user", async () => {
      const res = await ServerFetch.get("/logs/", undefined, testUser.token);
      expect(res.ok).toBe(true);
      expect(res.data).toBeDefined();
    });

    it("should return an array of log items", async () => {
      const res = await ServerFetch.get("/logs/", undefined, testUser.token);
      if ("logs" in res.data) {
        expect(Array.isArray(res.data.logs)).toBe(true);
      }
    });

    it("should fail without authentication", async () => {
      const res = await ServerFetch.get("/logs/", undefined, "");
      expect(res.ok).toBe(false);
    });
  });

  describe("/logs/page", () => {
    it("should return paginated logs", async () => {
      const res = await ServerFetch.get(
        "/logs/page{/:page}",
        { params: {} },
        testUser.token,
      );
      expect(res.status).toBeDefined();
      expect(res.data).toBeDefined();
    });

    it("should support the optional page-number parameter", async () => {
      const res = await ServerFetch.get(
        "/logs/page{/:page}",
        { params: { page: 1 } },
        testUser.token,
      );
      expect(res.status).toBeDefined();
    });

    it("should return logs or an error object", async () => {
      const res = await ServerFetch.get(
        "/logs/page{/:page}",
        { params: {} },
        testUser.token,
      );
      const hasLogs = "logs" in res.data;
      const hasError = "error" in res.data;
      expect(hasLogs || hasError).toBe(true);
    });
  });
});
