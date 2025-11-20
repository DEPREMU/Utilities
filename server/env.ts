import dotenv from "dotenv";
import { Env } from "@types";

dotenv.config({ path: "../.env" });

const REQUIRED_VARS: (keyof Env)[] = [
  "HOST",
  "PORT",
  "WS_URL",
  "__DEV__",
  "DB_PORT",
  "DB_USER",
  "DB_PASS",
  "DB_NAME",
  "DB_HOST",
  "API_URL",
  "USE_HTTPS",
  "JWT_SECRET",
  "ADMIN_EMAIL",
  "ADMIN_PASSWORD",
  "VAPID_PUBLIC_KEY",
  "VAPID_PRIVATE_KEY",
  "DB_ENCRYPTION_PASS",
  "DELETE_OLD_SESSIONS",
  "DEEPL_TRANSLATOR_API",
  "FIREBASE_SERVICE_ACCOUNT",
  "SECRET_KEY_TO_ENCRYPTION",
];

export const validateServerEnv = () => {
  const missing = REQUIRED_VARS.filter((k) => !process.env[k]);
  if (missing.length) {
    console.warn(
      `Missing environment variables: ${missing.join(
        ", ",
      )}. Default values are used where applicable.`,
    );
  }
};

const env: Env = {
  __DEV__: process.env.__DEV__ === "true" || false,
  HOST: process.env.HOST || "localhost",
  PORT: Number(process.env.PORT || "3000"),
  WS_URL: process.env.WS_URL || "ws://localhost:3000/",
  API_URL: process.env.API_URL || "http://localhost:3000/api",
  DB_USER: process.env.DB_USER || "Utilities",
  DB_PORT: Number(process.env.DB_PORT || "5432"),
  DB_PASS: process.env.DB_PASS || "fny0a98dfnyacy389yas8dyawef89nywa98fa",
  DB_NAME: process.env.DB_NAME || "UtilitiesDB",
  DB_HOST: process.env.DB_HOST || "localhost",
  USE_HTTPS: process.env.USE_HTTPS === "true" || false,
  JWT_SECRET: process.env.JWT_SECRET || "7rg398cg9savc93q87fvvca08fv",
  ADMIN_PASSWORD: process.env.ADMIN_PASSWORD || "",
  VAPID_PUBLIC_KEY: process.env.VAPID_PUBLIC_KEY || "",
  VAPID_PRIVATE_KEY: process.env.VAPID_PRIVATE_KEY || "",
  DB_ENCRYPTION_PASS: process.env.DB_ENCRYPTION_PASS || "",
  DELETE_OLD_SESSIONS: process.env.DELETE_OLD_SESSIONS === "true" || false,
  DEEPL_TRANSLATOR_API: process.env.DEEPL_TRANSLATOR_API || "",
  FIREBASE_SERVICE_ACCOUNT: process.env.FIREBASE_SERVICE_ACCOUNT || "",
  SECRET_KEY_TO_ENCRYPTION:
    process.env.SECRET_KEY_TO_ENCRYPTION || "0123456789abcdef0123456789abcdef",
  ADMIN_EMAIL: process.env.ADMIN_EMAIL || "",
};

export default env;
