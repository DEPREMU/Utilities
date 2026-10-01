import { describe, expect, it, beforeAll } from "@jest/globals";
import { ServerFetch } from "@common";
import { createTestUser, type TestUser } from "../../../utils/testHelpers";

let testUser: TestUser;

beforeAll(async () => {
  testUser = await createTestUser();
});

describe("GET /clipboard", () => {
  describe("/clipboard/:deviceId", () => {
    it("should return clipboard items for a valid device", async () => {
      const res = await ServerFetch.get(
        "/clipboard/:deviceId{/:page}",
        { params: { deviceId: testUser.deviceId }, query: {} },
        testUser.token,
      );
      expect(res.ok).toBe(true);
      expect(res.data).toBeDefined();
    });

    it("should return an array of clipboard items", async () => {
      const res = await ServerFetch.get(
        "/clipboard/:deviceId{/:page}",
        { params: { deviceId: testUser.deviceId }, query: {} },
        testUser.token,
      );
      if ("clipboardItems" in res.data) {
        expect(Array.isArray(res.data.clipboardItems)).toBe(true);
      }
    });

    it("should support optional page parameter", async () => {
      const res = await ServerFetch.get(
        "/clipboard/:deviceId{/:page}",
        {
          params: {
            page: 1,
            deviceId: testUser.deviceId,
          },
          query: {},
        },
        testUser.token,
      );
      expect(res.status).toBeDefined();
    });
  });
});
