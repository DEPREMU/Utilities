import fs from "fs";
import path from "path";
import dotenv from "dotenv";
import { defineConfig } from "prisma/config";

let root = path.resolve();

let attempts = 5;
while (attempts-- > 0) {
  root = path.dirname(root);
  if (fs.existsSync(path.join(root, ".env"))) {
    dotenv.config({ path: path.join(root, ".env") });
    break;
  }
}

if (!process.env.DATABASE_URL) {
  throw new Error("DATABASE_URL is not defined in the environment variables.");
}

export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: {
    path: "prisma/migrations",
  },
  datasource: {
    url: process.env.DATABASE_URL,
  },
});
