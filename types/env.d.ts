export type Env<B extends boolean = false> = {
  API_URL: string;
  JWT_SECRET: string;
  TYPE_BUILD: "normal" | "clipboard" | "test";
  ADMIN_EMAIL: string;
  BUILD_PROFILE: "production" | "development" | string;
  DEEPL_TRANSLATOR_API: string;
  SECRET_KEY_TO_ENCRYPTION: string;
  FIREBASE_SERVICE_ACCOUNT: string;
  DB_ENCRYPTION_PASS: string;
  ADMIN_PASSWORD: string;
  DATABASE_URL: string;
  USE_HTTPS: B extends true ? boolean : string;
  __DEV__: B extends true ? boolean : string;
  WS_URL: string;
  IV: string;
};
