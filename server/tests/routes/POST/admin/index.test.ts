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

describe("POST /admin", () => {
  describe("/admin/unlock", () => {
    it("should attempt admin unlock with valid credentials", async () => {
      const res = await ServerFetch.post(
        "/admin/unlock",
        {
          body: {
            deviceId: testUser.deviceId,
            password: "test-admin-password",
          },
        },
        testUser.token,
      );
      expect(res.status).toBeDefined();
      expect(res.data).toBeDefined();
    });

    it("should return success or error in response", async () => {
      const res = await ServerFetch.post(
        "/admin/unlock",
        {
          body: {
            deviceId: testUser.deviceId,
            password: "wrong-password",
          },
        },
        testUser.token,
      );
      const hasSuccess = "success" in res.data;
      const hasError = "error" in res.data;
      expect(hasSuccess || hasError).toBe(true);
    });

    it("should fail without authentication", async () => {
      const res = await ServerFetch.post(
        "/admin/unlock",
        {
          body: {
            deviceId: "fake-device",
            password: "test",
          },
        },
        "invalid-token",
      );
      expect(res.ok).toBe(false);
    });
  });
});
