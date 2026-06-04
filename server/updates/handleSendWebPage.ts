import fs from "fs";
import path from "path";
import chalk from "chalk";
import { Logger } from "@common";
import { serverPath } from "../config.ts";
import { Request, Response } from "express";

const webPageDir = path.join(serverPath, "updates", "web-page");

const getFinalHTML = (tries: number = 0) => {
  try {
    if (tries > 3)
      throw new Error("Failed to load web page files after multiple attempts.");

    const html = fs.readFileSync(path.join(webPageDir, "index.html"), "utf-8");

    return html;
  } catch (error) {
    Logger.error(chalk.red("Error loading web page files:"), error);
    return getFinalHTML(tries + 1);
  }
};

const finalHtml = getFinalHTML();

const handleSendWebPage = (_: Request, res: Response) => {
  try {
    res.setHeader("Content-Type", "text/html");
    res.send(finalHtml);
  } catch (error) {
    Logger.error(chalk.red("Error sending updates web page:"), error);
    try {
      res.status(500).send("Error loading updates web page: " + String(error));
    } catch {
      // Ignore
    }
  }
};

export default handleSendWebPage;
