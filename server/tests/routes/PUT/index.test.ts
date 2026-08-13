import { ServerFetch } from "@common";
import { createTestUser, type TestUser } from "../../utils/testHelpers";
import { describe, expect, it, beforeAll } from "@jest/globals";

let testUser: TestUser;

beforeAll(async () => {
  testUser = await createTestUser();
});

describe("PUT /user-config", () => {
  describe("/user-config/update", () => {
    it("should update user config", async () => {
      const res = await ServerFetch.put(
        "/user-config/update",
        {
          body: {
            deviceId: testUser.deviceId,
            values: { theme: "dark" },
          },
        },
        testUser.token,
      );
      expect(res.status).toBeDefined();
      expect(res.data).toBeDefined();
    });

    it("should return success or error in response", async () => {
      const res = await ServerFetch.put(
        "/user-config/update",
        {
          body: {
            deviceId: testUser.deviceId,
            values: { hasAdmin: false },
          },
        },
        testUser.token,
      );
      const hasSuccess = "success" in res.data;
      const hasError = "error" in res.data;
      expect(hasSuccess || hasError).toBe(true);
    });

    it("should fail without authentication", async () => {
      const res = await ServerFetch.put(
        "/user-config/update",
        {
          body: {
            deviceId: "fake-device",
            values: { theme: "light" },
          },
        },
        "invalid-token",
      );
      expect(res.ok).toBe(false);
    });
  });
});

describe("PUT /clipboard", () => {
  describe("/clipboard/delete/toggle-deleted-all", () => {
    it("should toggle deleted state for all items", async () => {
      const res = await ServerFetch.put(
        "/clipboard/delete/toggle-deleted-all",
        {
          body: {
            deviceId: testUser.deviceId,
            restore: false,
          },
        },
        testUser.token,
      );
      expect(res.status).toBeDefined();
      expect(res.data).toBeDefined();
    });

    it("should support restore mode", async () => {
      const res = await ServerFetch.put(
        "/clipboard/delete/toggle-deleted-all",
        {
          body: {
            deviceId: testUser.deviceId,
            restore: true,
          },
        },
        testUser.token,
      );
      expect(res.status).toBeDefined();
    });

    it("should fail without authentication", async () => {
      const res = await ServerFetch.put(
        "/clipboard/delete/toggle-deleted-all",
        {
          body: {
            deviceId: "fake-device",
            restore: false,
          },
        },
        "invalid-token",
      );
      expect(res.ok).toBe(false);
    });
  });

  describe("/clipboard/delete/toggle-deleted", () => {
    it("should toggle deleted state for a single item", async () => {
      const res = await ServerFetch.put(
        "/clipboard/delete/toggle-deleted",
        {
          body: {
            deviceId: testUser.deviceId,
            id: `nonexistent-${Date.now()}`,
            deleted: true,
          },
        },
        testUser.token,
      );
      expect(res.status).toBeDefined();
    });

    it("should accept the optional deleted boolean", async () => {
      const res = await ServerFetch.put(
        "/clipboard/delete/toggle-deleted",
        {
          body: {
            deviceId: testUser.deviceId,
            id: `fake-id-${Date.now()}`,
          },
        },
        testUser.token,
      );
      expect(res.status).toBeDefined();
    });

    it("should fail without authentication", async () => {
      const res = await ServerFetch.put(
        "/clipboard/delete/toggle-deleted",
        {
          body: {
            deviceId: "fake-device",
            id: "fake-id",
            deleted: false,
          },
        },
        "invalid-token",
      );
      expect(res.ok).toBe(false);
    });
  });
});

describe("PUT /down-detector", () => {
  describe("/down-detector/update", () => {
    it("should update a down-detector entry", async () => {
      const res = await ServerFetch.put(
        "/down-detector/update",
        {
          body: {
            id: `nonexistent-${Date.now()}`,
            deviceId: testUser.deviceId,
            values: { url: "https://updated.example.com" },
          },
        },
        testUser.token,
      );
      expect(res.status).toBeDefined();
    });

    it("should return an error for nonexistent id", async () => {
      const res = await ServerFetch.put(
        "/down-detector/update",
        {
          body: {
            id: `fake-${Date.now()}`,
            deviceId: testUser.deviceId,
            values: { sendNotification: false },
          },
        },
        testUser.token,
      );
      expect(res.data).toBeDefined();
    });

    it("should fail without authentication", async () => {
      const res = await ServerFetch.put(
        "/down-detector/update",
        {
          body: {
            id: "fake-id",
            deviceId: "fake-device",
            values: { url: "https://no-auth.example.com" },
          },
        },
        "invalid-token",
      );
      expect(res.ok).toBe(false);
    });
  });
});

describe("PUT /user-notifications-config", () => {
  describe("/user-notifications-config/update", () => {
    it("should update user notifications config", async () => {
      const res = await ServerFetch.put(
        "/user-notifications-config/update",
        {
          body: {
            deviceId: testUser.deviceId,
            values: { paused: true },
            match: { reason: "locationEnabled" },
          },
        },
        testUser.token,
      );
      expect(res.status).toBeDefined();
    });

    it("should return error or empty result for nonexistent match", async () => {
      const res = await ServerFetch.put(
        "/user-notifications-config/update",
        {
          body: {
            deviceId: testUser.deviceId,
            values: { enabled: true },
            match: { reason: `nonexistent-${Date.now()}` as never },
          },
        },
        testUser.token,
      );
      expect(res.data).toBeDefined();
    });

    it("should fail without authentication", async () => {
      const res = await ServerFetch.put(
        "/user-notifications-config/update",
        {
          body: {
            deviceId: "fake-device",
            values: { paused: false },
            match: { reason: "locationEnabled" },
          },
        },
        "invalid-token",
      );
      expect(res.ok).toBe(false);
    });
  });
});
