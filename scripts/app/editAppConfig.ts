import fs from "fs";
import path from "path";
import { APP_PATH } from "../config.ts";

export const pathAppConfig = path.join(APP_PATH, "app.config.ts");

export const contentAppConfig = fs.readFileSync(
  pathAppConfig,
  "utf8",
) as string;
