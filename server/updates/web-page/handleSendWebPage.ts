import fs from "fs";
import path from "path";
import { serverPath } from "config";
import { Request, Response } from "express";
import env from "env";
import chalk from "chalk";

const webPageDir = path.join(serverPath, "updates", "web-page");
const UPDATES_SERVER_URL = env.API_URL.replace(
  "api",
  "updates/is-update-available",
);

const handleSendWebPage = (_: Request, res: Response) => {
  try {
    const css = fs.readFileSync(path.join(webPageDir, "styles.css"), "utf-8");
    const js = fs.readFileSync(path.join(webPageDir, "index.js"), "utf-8");
    const html = fs.readFileSync(path.join(webPageDir, "index.html"), "utf-8");

    const finalHtml = html
      .replace("{{CSS}}", `<style>${css}</style>`)
      .replace("{{JS}}", `<script>${js}</script>`)
      .replace("{{UPDATES_SERVER_URL}}", UPDATES_SERVER_URL);

    res.setHeader("Content-Type", "text/html");
    res.send(finalHtml);
  } catch (error) {
    console.error(chalk.red("Error sending updates web page:"), error);
    try {
      res.status(500).send("Error loading updates web page: " + String(error));
    } catch {
      // Ignore
    }
  }
};

export default handleSendWebPage;
