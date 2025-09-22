import dotenv from "dotenv";
import type { Env } from "../types/index";

dotenv.config({ path: "../.env" });

const REQUIRED_VARS: (keyof Env)[] = [
  "HOST",
  "PORT",
  "WS_URL",
  "API_URL",
  "USE_HTTPS",
  "JWT_SECRET",
  "SUPABASE_URL",
  "SUPABASE_KEY",
  "ADMIN_PASSWORD",
  "VAPID_PUBLIC_KEY",
  "VAPID_PRIVATE_KEY",
  "EMAIL_APP_SUPABASE",
  "DEEPL_TRANSLATOR_API",
  "PASSWORD_APP_SUPABASE",
];

export const validateServerEnv = () => {
  const missing = REQUIRED_VARS.filter((k) => !process.env[k]);
  if (missing.length) {
    console.warn(
      `⚠️  Missing environment variables: ${missing.join(
        ", ",
      )}. Default values are used where applicable.`,
    );
  }
};

const env: Env = {
  HOST: process.env.HOST || "localhost",
  PORT: Number(process.env.PORT) || 3000,
  WS_URL: process.env.WS_URL || "ws://localhost:3000/",
  API_URL: process.env.API_URL || "http://localhost:3000/api",
  USE_HTTPS: process.env.USE_HTTPS === "true" || false,
  SUPABASE_URL: process.env.SUPABASE_URL || "",
  SUPABASE_KEY: process.env.SUPABASE_KEY || "",
  ADMIN_PASSWORD: process.env.ADMIN_PASSWORD || "",
  EMAIL_APP_SUPABASE: process.env.EMAIL_APP_SUPABASE || "",
  PASSWORD_APP_SUPABASE: process.env.PASSWORD_APP_SUPABASE || "",
  VAPID_PUBLIC_KEY: process.env.VAPID_PUBLIC_KEY || "",
  VAPID_PRIVATE_KEY: process.env.VAPID_PRIVATE_KEY || "",
  DEEPL_TRANSLATOR_API: process.env.DEEPL_TRANSLATOR_API || "",
  JWT_SECRET: process.env.JWT_SECRET || "7rg398cg9savc93q87fvvca08fv",
};

export default env;
