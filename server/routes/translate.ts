import env from "../env.ts";
import chalk from "chalk";
import express from "express";
import { sendResponse } from "../variables.ts";
import { URLSearchParams } from "url";
import { RequestTranslate, ResponseTranslate } from "@types";

export const translate = async (
  req: express.Request<unknown, unknown, RequestTranslate>,
  res: express.Response<ResponseTranslate>,
) => {
  try {
    if (!req.body)
      return sendResponse(
        res,
        "BAD_REQUEST",
        { error: "Body missing" },
        "/translate",
      );

    const { text, targetLang } = req.body;
    if (!text || !targetLang)
      return sendResponse(
        res,
        "BAD_REQUEST",
        { error: "Params missing" },
        "/translate",
      );

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
      let errorData: { message?: string } | null = null;
      try {
        errorData = await response.json();
      } catch {
        // Ignore JSON parsing errors
      }
      return sendResponse(
        res,
        "INTERNAL_SERVER_ERROR",
        { error: errorData?.message || "Translation failed" },
        "/translate",
      );
    }

    const data = await response.json();
    sendResponse(
      res,
      "SUCCESS",
      { translatedText: data.translations?.[0]?.text || "" },
      "/translate",
    );
  } catch (error) {
    console.error(chalk.red("Error during translation request:"), error);
    sendResponse(
      res,
      "INTERNAL_SERVER_ERROR",
      { error: "Internal server error" },
      "/translate",
    );
  }
};
