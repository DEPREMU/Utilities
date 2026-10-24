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
        "/down-detector/:deviceId{/:lastId}",
        { params: { deviceId: testUser.deviceId }, query: {} },
        testUser.token,
      );
      expect(res.ok).toBe(true);
      expect(res.data).toBeDefined();
    });

    it("should return an array of down detectors", async () => {
      const res = await ServerFetch.get(
        "/down-detector/:deviceId{/:lastId}",
        { params: { deviceId: testUser.deviceId }, query: {} },
        testUser.token,
      );
      if ("downDetectors" in res.data) {
        expect(Array.isArray(res.data.downDetectors)).toBe(true);
      }
    });

    it("should support optional lastId parameter", async () => {
      const r = await ServerFetch.get(
        "/down-detector/:deviceId{/:lastId}",
        {
          params: {
            deviceId: testUser.deviceId,
          },
          query: {},
        },
        testUser.token,
      );

      const res = await ServerFetch.get(
        "/down-detector/:deviceId{/:lastId}",
        {
          params: {
            deviceId: testUser.deviceId,
            lastId: (
              (r.data as Record<string, unknown>).downDetectors as Array<{
                id: string;
              }>
            ).pop()?.id,
          },
          query: {},
        },
        testUser.token,
      );
      expect(res.status).toBeDefined();
    });
  });
});
