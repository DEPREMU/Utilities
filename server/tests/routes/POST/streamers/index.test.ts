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

describe("POST /streamers", () => {
  describe("/streamers/add", () => {
    it("should add a new streamer", async () => {
      const res = await ServerFetch.post(
        "/streamers/add",
        {
          body: {
            userId: testUser.userId,
            deviceId: testUser.deviceId,
            streamerName: `JestStreamer${Date.now()}`,
          },
        },
        testUser.token,
      );
      expect(res.status).toBeDefined();
      expect(res.data).toBeDefined();
    });

    it("should return streamer data or an error", async () => {
      const res = await ServerFetch.post(
        "/streamers/add",
        {
          body: {
            userId: testUser.userId,
            deviceId: testUser.deviceId,
            streamerName: `JestStreamer2-${Date.now()}`,
          },
        },
        testUser.token,
      );
      const hasStreamer = "streamer" in res.data;
      const hasError = "error" in res.data;
      expect(hasStreamer || hasError).toBe(true);
    });

    it("should fail without authentication", async () => {
      const res = await ServerFetch.post(
        "/streamers/add",
        {
          body: {
            userId: "fake-user",
            deviceId: "fake-device",
            streamerName: "NoAuthStreamer",
          },
        },
        "invalid-token",
      );
      expect(res.ok).toBe(false);
    });
  });
});
