import { randomUUID } from "crypto";
import { ServerFetch } from "@common";
import type { ResponseAuth } from "@types";

const TEST_PASSWORD = "Test123!";

const generateUniqueEmail = (): string =>
  `jest-${randomUUID()}@test.local`;

const generateUniqueDeviceId = (): string =>
  `jest-device-${Date.now()}-${randomUUID().slice(0, 8)}`;

type TestUser = {
  email: string;
  password: string;
  deviceId: string;
  token: string;
  userId: string;
};

const createTestUser = async (): Promise<TestUser> => {
  const email = generateUniqueEmail();
  const deviceId = generateUniqueDeviceId();

  const signupRes = await ServerFetch.post("/auth/signup", {
    body: { lang: "en", email, password: TEST_PASSWORD },
  });

  if (!signupRes.ok) {
    throw new Error(`Signup failed: ${JSON.stringify(signupRes.data)}`);
  }

  const loginRes = await ServerFetch.post("/auth/login", {
    body: {
      lang: "en",
      email,
      password: TEST_PASSWORD,
      deviceId,
      rememberMe: false,
      notificationToken: `Web-${deviceId}`,
    },
  });

  const loginData = loginRes.data as ResponseAuth<"login">;

  if (!loginData.success || !loginData.token || !loginData.user?.userId) {
    throw new Error(`Login failed: ${JSON.stringify(loginData)}`);
  }

  return {
    email,
    password: TEST_PASSWORD,
    deviceId,
    token: loginData.token,
    userId: loginData.user.userId,
  };
};

export { createTestUser, generateUniqueEmail, generateUniqueDeviceId };
export type { TestUser };
