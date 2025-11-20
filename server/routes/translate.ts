import env from "../env.ts";
import chalk from "chalk";
import express from "express";
import { URLSearchParams } from "url";
import { RequestTranslate, ResponseTranslate } from "@types";

export const translate = async (
  req: express.Request<unknown, unknown, RequestTranslate>,
  res: express.Response<ResponseTranslate>,
) => {
  try {
    if (!req.body) {
      res.status(400).json({ error: "Body missing" });
      return;
    }

    const { text, targetLang } = req.body;
    if (!text || !targetLang) {
      res.status(400).json({ error: "Params missing" });
      return;
    }
    const url = "https://api-free.deepl.com/v2/translate";
    const response = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: new URLSearchParams({
        auth_key: env.DEEPL_TRANSLATOR_API,
        text,
        target_lang: targetLang,
      }),
    });
    if (!response.ok) {
      const errorData = await response.json();
      res
        .status(500)
        .json({ error: errorData?.message || "Translation failed" });
      return;
    }

    const data = await response.json();
    res.json({ translatedText: data.translations?.[0]?.text || "" });
  } catch (error) {
    console.error(chalk.red("Error during translation request:"), error);
    try {
      res.status(500).json({ error: "Internal server error" });
    } catch {
      // Ignore
    }
  }
};
