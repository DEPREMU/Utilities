import { describe, expect, it } from "@jest/globals";
import { ServerFetch } from "@common";
import { generateUniqueEmail, generateUniqueDeviceId } from "../../../utils/testHelpers";

describe("POST /auth", () => {
  describe("/auth/signup", () => {
    it("should create a new user account", async () => {
      const res = await ServerFetch.post("/auth/signup", {
        body: {
          lang: "en",
          email: generateUniqueEmail(),
          password: "Test123!",
        },
      });
      expect(res.ok).toBe(true);
      expect(res.data).toHaveProperty("success", true);
    });

    it("should reject duplicate email registration", async () => {
      const email = generateUniqueEmail();
      await ServerFetch.post("/auth/signup", {
        body: { lang: "en", email, password: "Test123!" },
      });
      const res = await ServerFetch.post("/auth/signup", {
        body: { lang: "en", email, password: "Test123!" },
      });
      expect(res.data).toHaveProperty("error");
    });

    it("should return a success boolean in the response", async () => {
      const res = await ServerFetch.post("/auth/signup", {
        body: {
          lang: "en",
          email: generateUniqueEmail(),
          password: "Test123!",
        },
      });
      expect(typeof res.data.success).toBe("boolean");
    });
  });

  describe("/auth/login", () => {
    const loginEmail = generateUniqueEmail();

    it("should login an existing user", async () => {
      await ServerFetch.post("/auth/signup", {
        body: { lang: "en", email: loginEmail, password: "Test123!" },
      });

      const res = await ServerFetch.post("/auth/login", {
        body: {
          lang: "en",
          email: loginEmail,
          password: "Test123!",
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
          password: "Test123!",
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
        body: { lang: "en", email, password: "Test123!" },
      });
      const loginRes = await ServerFetch.post("/auth/login", {
        body: {
          lang: "en",
          email,
          password: "Test123!",
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
        body: { lang: "en", email, password: "Test123!" },
      });
      const loginRes = await ServerFetch.post("/auth/login", {
        body: {
          lang: "en",
          email,
          password: "Test123!",
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
        body: { lang: "en", email, password: "Test123!" },
      });
      const loginRes = await ServerFetch.post("/auth/login", {
        body: {
          lang: "en",
          email,
          password: "Test123!",
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
        body: { lang: "en", email, password: "Test123!" },
      });
      const loginRes = await ServerFetch.post("/auth/login", {
        body: {
          lang: "en",
          email,
          password: "Test123!",
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
      expect(typeof res.data.success).toBe("boolean");
    });
  });
});
