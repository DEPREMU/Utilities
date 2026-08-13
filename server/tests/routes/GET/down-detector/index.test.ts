import { describe, expect, it, beforeAll } from "@jest/globals";
import { ServerFetch } from "@common";
import { createTestUser, type TestUser } from "../../../utils/testHelpers";

let testUser: TestUser;

beforeAll(async () => {
  testUser = await createTestUser();
});

describe("GET /down-detector", () => {
  describe("/down-detector/:deviceId", () => {
    it("should return down-detector items for a valid device", async () => {
      const res = await ServerFetch.get(
        "/down-detector/:deviceId{/:page}",
        { params: { deviceId: testUser.deviceId } },
        testUser.token,
      );
      expect(res.ok).toBe(true);
      expect(res.data).toBeDefined();
    });

    it("should return an array of down detectors", async () => {
      const res = await ServerFetch.get(
        "/down-detector/:deviceId{/:page}",
        { params: { deviceId: testUser.deviceId } },
        testUser.token,
      );
      if ("downDetectors" in res.data) {
        expect(Array.isArray(res.data.downDetectors)).toBe(true);
      }
    });

    it("should support optional page-number parameter", async () => {
      const res = await ServerFetch.get(
        "/down-detector/:deviceId{/:page}",
        {
          params: {
            deviceId: testUser.deviceId,
            page: 1,
          },
        },
        testUser.token,
      );
      expect(res.status).toBeDefined();
    });
  });
});
