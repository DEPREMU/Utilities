import {
  RequestAddStreamer,
  ResponseAddStreamer,
  RequestGetIsLiveStreamer,
  ResponseGetIsLiveStreamer,
} from "@types";
import axios from "axios";
import chalk from "chalk";
import express from "express";
import { sendResponse } from "@common";
import { insertIntoTable } from "../database/functions.ts";

const getLinkImageStreamer = async (streamer: string) => {
  try {
    streamer = streamer.toLowerCase().replace(/\s+/g, "");
    const { data } = await axios.get(`https://www.twitch.tv/${streamer}`);
    if (!data) return;
    const imageElement = data
      .split(">")
      .find((e: string) => e.includes("og:image"));

    if (!imageElement) return;
    const image = imageElement
      .split(" ")
      .find((e: string) => e.includes("content="))
      // eslint-disable-next-line quotes
      .split('"')[1];

    return image;
  } catch (error) {
    console.error("Error fetching streamer image:", error);
    return;
  }
};

export const isLiveStreamer = async (streamer: string): Promise<boolean> => {
  try {
    if (!streamer) return false;
    streamer = streamer.toLowerCase().replace(/\s/g, "");
    const { data }: { data: string } = await axios.get(
      `https://www.twitch.tv/${streamer}`,
    );

    const script = data
      .split(">")
      .find((e: string) => e.includes("isLiveBroadcast"));
    if (!script) return false;

    const json = JSON.parse(script.replace("</script", ""));
    const isLive: boolean =
      json?.["@graph"]?.[0]?.publication?.isLiveBroadcast || false;
    return isLive;
  } catch (error) {
    console.error("Error checking if streamer is live:", error);
    return false;
  }
};

export const getIsLiveStreamer = async (
  req: express.Request<unknown, unknown, RequestGetIsLiveStreamer>,
  res: express.Response<ResponseGetIsLiveStreamer>,
) => {
  try {
    const { streamer } = req.body || { streamer: null };
    if (!streamer || !streamer.name || streamer.name.trim() === "")
      return sendResponse(
        res,
        "BAD_REQUEST",
        { error: "Streamer name is required" },
        "/getIsLiveStreamer",
      );

    const isLive = await isLiveStreamer(streamer.name);
    sendResponse(
      res,
      "SUCCESS",
      { streamer: { ...streamer, isLive } },
      "/getIsLiveStreamer",
    );
  } catch (error) {
    console.error(chalk.red("Error in getIsLiveStreamer:"), error);
    sendResponse(
      res,
      "INTERNAL_SERVER_ERROR",
      {
        error: "Failed to get live status of streamer",
      },
      "/getIsLiveStreamer",
    );
  }
};

export const addStreamer = async (
  req: express.Request<unknown, unknown, RequestAddStreamer>,
  res: express.Response<ResponseAddStreamer>,
) => {
  const { name, userId } = req.body || {};

  if (!name || !userId)
    return sendResponse(
      res,
      "BAD_REQUEST",
      { error: "Streamer name and User ID are required" },
      "/addStreamer",
    );

  try {
    const [, result] = await Promise.all([
      insertIntoTable("UserNotificationsConfig", {
        enabled: false,
        interval: -1,
        paused: false,
        pauseTime: -1,
        userId,
        streamer: name,
        reason: "streamers",
        updatedAt: new Date().toISOString(),
      }),
      insertIntoTable("Streamers", {
        name,
        userId,
        linkImage: await getLinkImageStreamer(name),
      }),
    ]);

    const data = result.data?.[0];

    if (!data)
      return sendResponse(
        res,
        "INTERNAL_SERVER_ERROR",
        { error: "Failed to add streamer: " + result.error || "Unknown error" },
        "/addStreamer",
      );

    const streamer = data
      ? { ...data, isLive: await isLiveStreamer(data.name) }
      : null;

    if (result.error)
      return sendResponse(
        res,
        "INTERNAL_SERVER_ERROR",
        { error: `Failed to add streamer: ${result.error}` },
        "/addStreamer",
      );

    sendResponse(res, "SUCCESS", { streamer, success: true }, "/addStreamer");
  } catch (error) {
    sendResponse(
      res,
      "INTERNAL_SERVER_ERROR",
      { error: `Failed to add streamer: ${error}` },
      "/addStreamer",
    );
  }
};
