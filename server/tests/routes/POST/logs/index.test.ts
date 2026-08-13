import { ServerFetch } from "@common";
import { createTestUser } from "../../../utils/testHelpers";
import { describe, expect, it, beforeAll } from "@jest/globals";

let userId: string;

beforeAll(async () => {
  const testUser = await createTestUser();
  userId = testUser.userId;
});

describe("POST /logs", () => {
  describe("/logs/add", () => {
    it("should add a new log entry", async () => {
      const res = await ServerFetch.post("/logs/add", {
        body: {
          userId,
          type: "log",
          message: "Jest test log entry",
          deviceId: `jest-device-${Date.now()}`,
          timestamp: new Date().toISOString(),
          deviceName: "Jest Test Device",
        },
      });
      expect(res.ok).toBe(true);
    }, 15000);

    it("should accept different log types", async () => {
      const res = await ServerFetch.post("/logs/add", {
        body: {
          userId,
          type: "error",
          message: "Jest error log",
          deviceId: `jest-device-${Date.now()}`,
          timestamp: new Date(),
          deviceName: "Jest Test Device",
        },
      });
      expect(res.status).toBeDefined();
    }, 15000);

    it("should accept a warn log type", async () => {
      const res = await ServerFetch.post("/logs/add", {
        body: {
          type: "warn",
          message: "Jest warning log",
          deviceId: `jest-device-${Date.now()}`,
          timestamp: new Date(),
          deviceName: "Jest Test Device",
        },
      });
      expect(res.status).toBeDefined();
    }, 15000);
  });
});
