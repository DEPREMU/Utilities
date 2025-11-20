import {
  RequestAddStreamer,
  ResponseAddStreamer,
  RequestGetIsLiveStreamer,
  ResponseGetIsLiveStreamer,
} from "@types";
import axios from "axios";
import express from "express";
import { insertIntoTable } from "../database/functions.ts";
import chalk from "chalk";

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
    if (!streamer) {
      res.status(400).json({ error: "Streamer name is required" });
      return;
    }

    const isLive = await isLiveStreamer(streamer.name);
    res.status(200).json({ streamer: { ...streamer, isLive } });
  } catch (error) {
    console.error(chalk.red("Error in getIsLiveStreamer:"), error);
    try {
      res.status(500).json({ error: `Unexpected error: ${error}` });
    } catch {
      // Ignore
    }
  }
};

export const addStreamer = async (
  req: express.Request<unknown, unknown, RequestAddStreamer>,
  res: express.Response<ResponseAddStreamer>,
) => {
  const { name, userId } = req.body || { name: "", userId: "" };

  if (!name || !userId) {
    res.status(400).json({ error: "Streamer name and User ID are required" });
    return;
  }
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

    let { data } = result;

    if (Array.isArray(data)) {
      data = data[0] || null;
    } else data = data || null;

    const streamer = data
      ? { ...data, isLive: await isLiveStreamer(data.name) }
      : null;

    if (result.error) {
      res.status(500).json({ error: "Failed to add streamer" });
      return;
    }
    res.status(201).json({ streamer, success: true });
  } catch (error) {
    try {
      res.status(500).json({ error: `Unexpected error: ${error}` });
    } catch {
      // Ignore
    }
  }
};
