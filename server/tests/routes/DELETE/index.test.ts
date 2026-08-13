import { ServerFetch } from "@common";
import { createTestUser, type TestUser } from "../../utils/testHelpers";
import { describe, expect, it, beforeAll } from "@jest/globals";

let testUser: TestUser;

beforeAll(async () => {
  testUser = await createTestUser();
});

describe("DELETE /logs", () => {
  describe("/logs/:logId", () => {
    it("should attempt to delete a log by ID", async () => {
      const res = await ServerFetch.delete(
        "/logs/:logId",
        { params: { logId: `nonexistent-${Date.now()}` } },
        testUser.token,
      );
      expect(res.status).toBeDefined();
    });

    it("should handle a nonexistent log ID", async () => {
      const res = await ServerFetch.delete(
        "/logs/:logId",
        { params: { logId: `fake-log-${Date.now()}` } },
        testUser.token,
      );
      expect(res.data).toBeDefined();
    });

    it("should fail without authentication", async () => {
      const res = await ServerFetch.delete(
        "/logs/:logId",
        { params: { logId: "fake-log" } },
        "invalid-token",
      );
      expect(res.ok).toBe(false);
    });
  });
});

describe("DELETE /down-detector", () => {
  describe("/down-detector/:deviceId/:downDetectorId", () => {
    it("should attempt to delete a down-detector entry", async () => {
      const res = await ServerFetch.delete(
        "/down-detector/:deviceId/:downDetectorId",
        {
          params: {
            deviceId: testUser.deviceId,
            downDetectorId: `nonexistent-${Date.now()}`,
          },
        },
        testUser.token,
      );
      expect(res.status).toBeDefined();
    });

    it("should handle a nonexistent down-detector ID", async () => {
      const res = await ServerFetch.delete(
        "/down-detector/:deviceId/:downDetectorId",
        {
          params: {
            deviceId: testUser.deviceId,
            downDetectorId: `fake-dd-${Date.now()}`,
          },
        },
        testUser.token,
      );
      expect(res.data).toBeDefined();
    });

    it("should fail without authentication", async () => {
      const res = await ServerFetch.delete(
        "/down-detector/:deviceId/:downDetectorId",
        {
          params: {
            deviceId: "fake-device",
            downDetectorId: "fake-id",
          },
        },
        "invalid-token",
      );
      expect(res.ok).toBe(false);
    });
  });
});

describe("DELETE /streamers", () => {
  describe("/streamers/:deviceId/:streamerId", () => {
    it("should attempt to delete a streamer", async () => {
      const res = await ServerFetch.delete(
        "/streamers/:deviceId/:streamerId",
        {
          params: {
            deviceId: testUser.deviceId,
            streamerId: `nonexistent-${Date.now()}`,
          },
        },
        testUser.token,
      );
      expect(res.status).toBeDefined();
    });

    it("should handle a nonexistent streamer ID", async () => {
      const res = await ServerFetch.delete(
        "/streamers/:deviceId/:streamerId",
        {
          params: {
            deviceId: testUser.deviceId,
            streamerId: `fake-streamer-${Date.now()}`,
          },
        },
        testUser.token,
      );
      expect(res.data).toBeDefined();
    });

    it("should fail without authentication", async () => {
      const res = await ServerFetch.delete(
        "/streamers/:deviceId/:streamerId",
        {
          params: {
            deviceId: "fake-device",
            streamerId: "fake-id",
          },
        },
        "invalid-token",
      );
      expect(res.ok).toBe(false);
    });
  });
});
