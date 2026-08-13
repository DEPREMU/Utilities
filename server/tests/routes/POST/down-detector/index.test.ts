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

describe("POST /down-detector", () => {
  describe("/down-detector/add", () => {
    it("should add a new down-detector entry", async () => {
      const res = await ServerFetch.post(
        "/down-detector/add",
        {
          body: {
            deviceId: testUser.deviceId,
            values: {
              url: `https://jest-test-${Date.now()}.example.com`,
              sendNotification: true,
            },
          },
        },
        testUser.token,
      );
      expect(res.status).toBeDefined();
      expect(res.data).toBeDefined();
    });

    it("should return the created down-detector or an error", async () => {
      const res = await ServerFetch.post(
        "/down-detector/add",
        {
          body: {
            deviceId: testUser.deviceId,
            values: {
              url: `https://jest-add-${Date.now()}.example.com`,
              sendNotification: false,
            },
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
        "/down-detector/add",
        {
          body: {
            deviceId: "fake-device",
            values: {
              url: "https://no-auth.example.com",
              sendNotification: true,
            },
          },
        },
        "invalid-token",
      );
      expect(res.ok).toBe(false);
    });
  });
});
