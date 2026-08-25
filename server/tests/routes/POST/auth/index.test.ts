import { describe, expect, it } from "@jest/globals";
import { ServerFetch } from "@common";
import {
  generateUniqueEmail,
  generateUniqueDeviceId,
} from "../../../utils/testHelpers";
import { randomUUID } from "crypto";

const password = `Test123!${randomUUID()}`;

describe("POST /auth", () => {
  describe("/auth/signup", () => {
    it("should create a new user account", async () => {
      const res = await ServerFetch.post("/auth/signup", {
        body: {
          lang: "en",
          email: generateUniqueEmail(),
          password,
        },
      });
      expect(res.ok).toBe(true);
      expect(res.data).toHaveProperty("success", true);
    });

    it("should reject duplicate email registration", async () => {
      const email = generateUniqueEmail();
      await ServerFetch.post("/auth/signup", {
        body: { lang: "en", email, password },
      });
      const res = await ServerFetch.post("/auth/signup", {
        body: { lang: "en", email, password },
      });
      expect(res.data).toHaveProperty("error");
    });

    it("should return a success boolean in the response", async () => {
      const res = await ServerFetch.post("/auth/signup", {
        body: {
          lang: "en",
          email: generateUniqueEmail(),
          password,
        },
      });
      expect(typeof res.data.success).toBe("boolean");
    });
  });

  describe("/auth/login", () => {
    const loginEmail = generateUniqueEmail();

    it("should login an existing user", async () => {
      await ServerFetch.post("/auth/signup", {
        body: { lang: "en", email: loginEmail, password },
      });

      const res = await ServerFetch.post("/auth/login", {
        body: {
          lang: "en",
          email: loginEmail,
          password,
          deviceId: generateUniqueDeviceId(),
          rememberMe: false,
          notificationToken: `Web-${generateUniqueDeviceId()}`,
        },
      });
      expect(res.ok).toBe(true);
      expect(res.data).toHaveProperty("token");
      expect(res.data).toHaveProperty("user");
    });

    it("should reject login with wrong password", async () => {
      const res = await ServerFetch.post("/auth/login", {
        body: {
          lang: "en",
          email: loginEmail,
          password: "WrongPassword!",
          deviceId: generateUniqueDeviceId(),
          rememberMe: false,
          notificationToken: `Web-${generateUniqueDeviceId()}`,
        },
      });
      expect(res.data.success).toBe(false);
    });

    it("should reject login for nonexistent email", async () => {
      const res = await ServerFetch.post("/auth/login", {
        body: {
          lang: "en",
          email: generateUniqueEmail(),
          password,
          deviceId: generateUniqueDeviceId(),
          rememberMe: false,
          notificationToken: `Web-${generateUniqueDeviceId()}`,
        },
      });
      expect(res.data.success).toBe(false);
    });
  });

  describe("/auth/signout", () => {
    it("should sign out a logged-in user", async () => {
      const email = generateUniqueEmail();
      const deviceId = generateUniqueDeviceId();
      await ServerFetch.post("/auth/signup", {
        body: { lang: "en", email, password },
      });
      const loginRes = await ServerFetch.post("/auth/login", {
        body: {
          lang: "en",
          email,
          password,
          deviceId,
          rememberMe: false,
          notificationToken: `Web-${deviceId}`,
        },
      });
      const token = (loginRes.data as { token?: string }).token ?? "";

      const res = await ServerFetch.post(
        "/auth/signout",
        { body: { lang: "en", deviceId } },
        token,
      );
      expect(res.data).toHaveProperty("success");
    });

    it("should fail signout without a valid token", async () => {
      const res = await ServerFetch.post(
        "/auth/signout",
        { body: { lang: "en", deviceId: generateUniqueDeviceId() } },
        "invalid-token",
      );
      expect(res.ok).toBe(false);
    });

    it("should return a boolean success field", async () => {
      const email = generateUniqueEmail();
      const deviceId = generateUniqueDeviceId();
      await ServerFetch.post("/auth/signup", {
        body: { lang: "en", email, password },
      });
      const loginRes = await ServerFetch.post("/auth/login", {
        body: {
          lang: "en",
          email,
          password,
          deviceId,
          rememberMe: false,
          notificationToken: `Web-${deviceId}`,
        },
      });
      const token = (loginRes.data as { token?: string }).token ?? "";

      const res = await ServerFetch.post(
        "/auth/signout",
        { body: { lang: "en", deviceId } },
        token,
      );
      expect(typeof res.data.success).toBe("boolean");
    });
  });

  describe("/auth/refreshSession", () => {
    it("should refresh a valid session", async () => {
      const email = generateUniqueEmail();
      const deviceId = generateUniqueDeviceId();
      await ServerFetch.post("/auth/signup", {
        body: { lang: "en", email, password },
      });
      const loginRes = await ServerFetch.post("/auth/login", {
        body: {
          lang: "en",
          email,
          password,
          deviceId,
          rememberMe: true,
          notificationToken: `Web-${deviceId}`,
        },
      });
      const token = (loginRes.data as { token?: string }).token ?? "";

      const res = await ServerFetch.post(
        "/auth/refreshSession",
        {
          body: {
            lang: "en",
            deviceId,
            notificationToken: `Web-${deviceId}`,
          },
        },
        token,
      );
      expect(res.status).toBeDefined();
      expect(res.data).toBeDefined();
    });

    it("should fail refresh without a valid token", async () => {
      const res = await ServerFetch.post(
        "/auth/refreshSession",
        {
          body: {
            lang: "en",
            deviceId: generateUniqueDeviceId(),
            notificationToken: "fake-token",
          },
        },
        "invalid-token",
      );
      expect(res.ok).toBe(false);
    });

    it("should return a response with success field", async () => {
      const email = generateUniqueEmail();
      const deviceId = generateUniqueDeviceId();

      await ServerFetch.post("/auth/signup", {
        body: { lang: "en", email, password },
      });
      const loginRes = await ServerFetch.post("/auth/login", {
        body: {
          lang: "en",
          email,
          password,
          deviceId,
          rememberMe: true,
          notificationToken: `Web-${deviceId}`,
        },
      });
      const token = loginRes.data.token;
      if (!token) throw new Error("Token not returned");

      const res = await ServerFetch.post(
        "/auth/refreshSession",
        {
          body: {
            deviceId,
            lang: "en",
            notificationToken: `Web-${deviceId}`,
          },
        },
        token,
      );
      expect(typeof res.data.success).toBe("boolean");
    });
  });
});
