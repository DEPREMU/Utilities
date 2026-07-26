import path from "path";
import dotenv from "dotenv";
import { defineConfig } from "prisma/config";

let DIR = path.resolve();
while (!DIR.endsWith("Utilities")) DIR = path.dirname(DIR);

dotenv.config({ path: path.join(DIR, ".env") });

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
