import { randomUUID } from "crypto";
import { ServerFetch } from "@common";
import { ResponseAuth } from "@types";

class UserDev {
  #userData: Omit<ResponseAuth<"login">, "success" | "error"> = {} as never;

  #email = "test@test.test";
  #password = "Test123!";
  #deviceId = `${Date.now()}-${randomUUID()}`;

  public get email() {
    return this.#email;
  }

  public get password() {
    return this.#password;
  }

  public get deviceId() {
    return this.#deviceId;
  }

  setUserData = (data: Omit<ResponseAuth<"login">, "success" | "error">) => {
    this.#userData = data;
  };

  getUserData = () => {
    return this.#userData;
  };

  initUserData = async () => {
    const res = await ServerFetch.post("/auth/login", {
      lang: "en",
      email: this.email,
      deviceId: this.deviceId,
      password: this.password,
      rememberMe: false,
      notificationToken: `Web-${this.deviceId}`,
    });

    const { success: _0, error, ...rest } = res.data;

    if (error) throw new Error(`Failed to login: ${error}`);

    Object.assign(this.#userData, rest);
  };

  getSessionToken = async (): Promise<string> => {
    if (!this.#userData.token) {
      await this.initUserData();
      return await this.getSessionToken();
    }

    return this.#userData.token;
  };
}

export const user = new UserDev();
