import dotenv from "dotenv";

dotenv.config({ path: "../.env" });

type Env = {
  HOST: string;
  USE_HTTPS: boolean;
  SUPABASE_URL: string;
  VAPID_PRIVATE_KEY: string;
  DEEPL_TRANSLATOR_API: string;
  PASSWORD_APP_SUPABASE: string;
  EMAIL_APP_SUPABASE: string;
  VAPID_PUBLIC_KEY: string;
  ADMIN_PASSWORD: string;
  SUPABASE_KEY: string;
  PORT: number;
};

const REQUIRED_VARS: (keyof Env)[] = [
  "HOST",
  "PORT",
  "USE_HTTPS",
  "SUPABASE_URL",
  "SUPABASE_KEY",
  "ADMIN_PASSWORD",
  "EMAIL_APP_SUPABASE",
  "PASSWORD_APP_SUPABASE",
  "VAPID_PUBLIC_KEY",
  "VAPID_PRIVATE_KEY",
  "DEEPL_TRANSLATOR_API",
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
  USE_HTTPS: process.env.USE_HTTPS === "true" || false,
  SUPABASE_URL: process.env.SUPABASE_URL || "",
  SUPABASE_KEY: process.env.SUPABASE_KEY || "",
  ADMIN_PASSWORD: process.env.ADMIN_PASSWORD || "",
  EMAIL_APP_SUPABASE: process.env.EMAIL_APP_SUPABASE || "",
  PASSWORD_APP_SUPABASE: process.env.PASSWORD_APP_SUPABASE || "",
  VAPID_PUBLIC_KEY: process.env.VAPID_PUBLIC_KEY || "",
  VAPID_PRIVATE_KEY: process.env.VAPID_PRIVATE_KEY || "",
  DEEPL_TRANSLATOR_API: process.env.DEEPL_TRANSLATOR_API || "",
};

export default env;
