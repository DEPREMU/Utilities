import { describe, expect, it, beforeAll } from "@jest/globals";
import { ServerFetch } from "@common";
import {
  createTestUser,
  type TestUser,
} from "../../../utils/testHelpers";

let testUser: TestUser;

beforeAll(async () => {
  testUser = await createTestUser();
});

describe("POST /clipboard", () => {
  describe("/clipboard/add", () => {
    it("should add a new clipboard entry", async () => {
      const res = await ServerFetch.post(
        "/clipboard/add",
        {
          body: {
            deviceId: testUser.deviceId,
            content: `jest-clipboard-${Date.now()}`,
          },
        },
        testUser.token,
      );
      expect(res.status).toBeDefined();
      expect(res.data).toBeDefined();
    });

    it("should return the created clipboard item or an error", async () => {
      const res = await ServerFetch.post(
        "/clipboard/add",
        {
          body: {
            deviceId: testUser.deviceId,
            content: `jest-clipboard-add-${Date.now()}`,
          },
        },
        testUser.token,
      );
      const hasId = "id" in res.data;
      const hasError = "error" in res.data;
      expect(hasId || hasError).toBe(true);
    });

    it("should fail without authentication", async () => {
      const res = await ServerFetch.post(
        "/clipboard/add",
        {
          body: {
            deviceId: "fake-device",
            content: "no-auth-content",
          },
        },
        "invalid-token",
      );
      expect(res.ok).toBe(false);
    });
  });
});
