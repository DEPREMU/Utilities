import path from "path";
import dotenv from "dotenv";
import { defineConfig } from "prisma/config";

let DIR = path.resolve();
while (!DIR.endsWith("Utilities")) DIR = path.dirname(DIR);

dotenv.config({ path: path.join(DIR, ".env") });

export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: {
    path: "prisma/migrations",
  },
  datasource: {
    url: `postgresql://${process.env.DB_USER}:${process.env.DB_PASS}@${process.env.DB_HOST}:${process.env.DB_PORT}/${process.env.DB_NAME}`,
  },
});
